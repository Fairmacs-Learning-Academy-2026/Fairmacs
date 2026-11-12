package com.fairmacs.lms.service.notification;

import com.fairmacs.lms.entity.Notification;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Zoho ZeptoMail / Zoho Mail email delivery channel for Fairmacs LMS.
 *
 * CRITICAL GUARANTEE:
 * - Disabled by default (app.notifications.email.enabled=false).
 * - When disabled, this channel performs ZERO network/SMTP connections, requires no credentials,
 *   never throws startup or runtime errors, and never emits false failure alerts.
 * - When enabled in the future, it renders the corporate HTML/text email template and dispatches
 *   via Zoho ZeptoMail API (or logs a clear configuration error if credentials are missing),
 *   recording delivery status on the Notification entity without affecting in-app state.
 */
@Component
public class EmailNotificationChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationChannel.class);

    private final NotificationEmailProperties emailProperties;
    private final EmailTemplateRenderer templateRenderer;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public EmailNotificationChannel(
            NotificationEmailProperties emailProperties,
            EmailTemplateRenderer templateRenderer,
            NotificationRepository notificationRepository,
            ObjectMapper objectMapper
    ) {
        this.emailProperties = emailProperties;
        this.templateRenderer = templateRenderer;
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Release 03.11.1 Strict Email Policy:
     * Exactly 3 events are permitted to dispatch email:
     * 1. COURSE_ASSIGNED
     * 2. COURSE_DUE_SOON (5-day deadline reminder)
     * 3. GENERAL_ANNOUNCEMENT
     * All other LMS events are strictly suppressed from email dispatch.
     */
    private static final java.util.Set<String> PERMITTED_EMAIL_TYPES = java.util.Set.of(
            com.fairmacs.lms.entity.NotificationType.COURSE_ASSIGNED,
            com.fairmacs.lms.entity.NotificationType.COURSE_DUE_SOON,
            com.fairmacs.lms.entity.NotificationType.GENERAL_ANNOUNCEMENT
    );

    @Override
    public String getChannelName() {
        return "EMAIL";
    }

    @Override
    public boolean isEnabled() {
        return emailProperties.isEnabled();
    }

    @Override
    public void deliver(Notification notification) {
        if (notification == null) {
            return;
        }

        // Strict guard: never attempt any external call or state change when email channel is disabled
        if (!emailProperties.isEnabled()) {
            return;
        }

        // Release 03.11.1: Only 3 events are permitted to trigger outgoing emails
        String type = notification.getType() != null ? notification.getType().trim().toUpperCase(java.util.Locale.ROOT) : "";
        if (!PERMITTED_EMAIL_TYPES.contains(type)) {
            log.debug("Email delivery suppressed for notification [id={}, type={}] by strict 3-event email policy.",
                    notification.getId(), notification.getType());
            notification.setEmailStatus("SUPPRESSED");
            notification.setEmailError("Email dispatch suppressed by policy for type: " + notification.getType());
            saveQuietly(notification);
            return;
        }

        // When email channel is enabled and type is permitted, mark record as PENDING for asynchronous outbox processing
        if (notification.getEmailStatus() == null || "DISABLED".equalsIgnoreCase(notification.getEmailStatus()) || "PENDING".equalsIgnoreCase(notification.getEmailStatus())) {
            notification.setEmailStatus("PENDING");
            notification.setEmailAttempts(0);
            saveQuietly(notification);
        }
    }

    /**
     * Executes the actual HTTP network dispatch to Zoho ZeptoMail.
     * Invoked asynchronously by NotificationEmailOutboxService outside of any active DB transaction.
     */
    public void sendEmailForNotification(Notification notification) throws Exception {
        if (notification == null) {
            return;
        }
        if (!emailProperties.isEnabled()) {
            return;
        }

        String type = notification.getType() != null ? notification.getType().trim().toUpperCase(java.util.Locale.ROOT) : "";
        if (!PERMITTED_EMAIL_TYPES.contains(type)) {
            notification.setEmailStatus("SUPPRESSED");
            notification.setEmailError("Email dispatch suppressed by policy for type: " + notification.getType());
            saveQuietly(notification);
            return;
        }

        User recipient = notification.getRecipient();
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            notification.setEmailStatus("SKIPPED");
            notification.setEmailError("Recipient has no email address configured");
            saveQuietly(notification);
            return;
        }

        EmailTemplateRenderer.RenderedEmail rendered = templateRenderer.render(
                notification,
                emailProperties.getFrontendBaseUrl()
        );

        sendViaZeptoMail(recipient, rendered);
    }

    private void sendViaZeptoMail(
            User recipient,
            EmailTemplateRenderer.RenderedEmail rendered
    ) throws Exception {
        String token = emailProperties.getZeptoMailSendToken();
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Zoho ZeptoMail token (ZEPTOMAIL_SEND_TOKEN) is not configured");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", Map.of(
                "address", emailProperties.getFromAddress(),
                "name", emailProperties.getFromName()
        ));
        payload.put("to", List.of(Map.of(
                "email_address", Map.of(
                        "address", recipient.getEmail(),
                        "name", recipient.getName() != null ? recipient.getName() : recipient.getEmail()
                )
        )));
        if (emailProperties.getReplyTo() != null && !emailProperties.getReplyTo().isBlank()) {
            payload.put("reply_to", List.of(Map.of(
                    "address", emailProperties.getReplyTo(),
                    "name", emailProperties.getFromName()
            )));
        }
        payload.put("subject", rendered.subject());
        payload.put("htmlbody", rendered.htmlBody());
        payload.put("textbody", rendered.textBody());

        String requestJson = objectMapper.writeValueAsString(payload);
        String authHeader = token.startsWith("Zoho-enczapikey")
                ? token
                : "Zoho-enczapikey " + token;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(emailProperties.getZeptoMailApiUrl()))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", authHeader)
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("ZeptoMail HTTP " + response.statusCode());
        }
    }

    private void saveQuietly(Notification notification) {
        try {
            if (notification.getId() != null) {
                notificationRepository.save(notification);
            }
        } catch (Exception ex) {
            log.debug("Could not update email status on notification {}: {}", notification.getId(), ex.getMessage());
        }
    }

    private String sanitizeErrorMessage(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Email dispatch error";
        }
        // Never leak tokens or credentials in stored error messages
        String cleaned = raw.replaceAll("(?i)Zoho-enczapikey\\s+\\S+", "[REDACTED]");
        return cleaned.length() > 300 ? cleaned.substring(0, 300) : cleaned;
    }
}
