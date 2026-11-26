package com.fairmacs.lms.service.notification;

import com.fairmacs.lms.entity.Notification;
import com.fairmacs.lms.entity.NotificationPriority;
import com.fairmacs.lms.entity.NotificationType;
import com.fairmacs.lms.entity.User;
import org.springframework.stereotype.Component;

/**
 * Reusable corporate email template renderer for Fairmacs LMS notifications.
 * Generates both HTML and plain-text payloads with safe links back to the LMS.
 */
@Component
public class EmailTemplateRenderer {

    public record RenderedEmail(String subject, String htmlBody, String textBody) {
    }

    public RenderedEmail render(Notification notification, String frontendBaseUrl) {
        User recipient = notification.getRecipient();
        String recipientName = (recipient != null && recipient.getName() != null && !recipient.getName().isBlank())
                ? recipient.getName()
                : "Team Member";

        String baseUrl = (frontendBaseUrl != null && !frontendBaseUrl.isBlank())
                ? frontendBaseUrl.replaceAll("/+$", "")
                : "http://localhost:5173";

        String actionPath = notification.getActionUrl();
        if (actionPath == null || actionPath.isBlank() || !actionPath.startsWith("/")) {
            actionPath = defaultActionPathForType(notification.getType());
        }

        // Sanitize to prevent open redirects: reject external protocols, protocol-relative '//', or malicious schemes
        String trimmedPath = actionPath.trim();
        if (trimmedPath.startsWith("//")
                || trimmedPath.toLowerCase().startsWith("/http:")
                || trimmedPath.toLowerCase().startsWith("/https:")
                || trimmedPath.toLowerCase().contains("javascript:")
                || trimmedPath.toLowerCase().contains("data:")) {
            trimmedPath = defaultActionPathForType(notification.getType());
        }

        // Ensure clean leading slash and no redundant slashes
        if (!trimmedPath.startsWith("/")) {
            trimmedPath = "/" + trimmedPath;
        }
        String safeRelativePath = trimmedPath.replaceAll("/+", "/");
        String fullActionUrl = baseUrl + safeRelativePath;

        String categoryBadge = formatCategoryLabel(notification.getType());
        String ctaLabel = formatCtaLabel(notification.getType());
        String priority = notification.getPriority() != null ? notification.getPriority() : NotificationPriority.NORMAL;
        String accentColor = resolveAccentColor(notification.getType(), priority);

        String subject;
        if (notification.getTitle() != null && notification.getTitle().startsWith("Reminder: 5 days left")) {
            subject = notification.getTitle();
        } else if (NotificationType.GENERAL_ANNOUNCEMENT.equalsIgnoreCase(notification.getType())) {
            subject = "[Fairmacs Announcement] " + notification.getTitle();
        } else {
            String subjectPrefix = (NotificationPriority.CRITICAL.equalsIgnoreCase(priority)
                    || NotificationPriority.HIGH.equalsIgnoreCase(priority))
                    ? "[Action Required] "
                    : "[Fairmacs LMS] ";
            subject = subjectPrefix + notification.getTitle();
        }

        String safeRecipient = escapeHtml(recipientName);
        String safeTitle = escapeHtml(notification.getTitle());
        String safeMessage = escapeHtml(notification.getMessage()).replace("\n", "<br/>");
        String safeCategory = escapeHtml(categoryBadge);
        String safePriority = escapeHtml(priority);
        String safeCta = escapeHtml(ctaLabel);
        String safeUrl = escapeHtml(fullActionUrl);

        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#F2F7FC;font-family:'Segoe UI',Inter,Arial,sans-serif;color:#172B4D;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background-color:#F2F7FC;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;background:#FFFFFF;border-radius:16px;border:1px solid #DCEBFA;overflow:hidden;box-shadow:0 8px 24px rgba(16,42,67,0.08);">
                          <tr>
                            <td style="background:linear-gradient(135deg,#102A43,#1677FF);padding:24px 32px;color:#FFFFFF;">
                              <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:0.85;font-weight:700;">Fairmacs Learning Academy</div>
                              <div style="font-size:20px;font-weight:700;margin-top:6px;">%s</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:28px 32px;">
                              <div style="margin-bottom:16px;">
                                <span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;background-color:#EBF4FF;color:%s;letter-spacing:0.4px;">%s</span>
                                <span style="display:inline-block;margin-left:8px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background-color:#F1F5F9;color:#475569;">Priority: %s</span>
                              </div>
                              <p style="font-size:15px;margin:0 0 12px 0;color:#172B4D;">Hello <strong>%s</strong>,</p>
                              <div style="font-size:15px;line-height:1.6;color:#334155;background:#F8FAFC;border-left:4px solid %s;padding:16px;border-radius:8px;margin:16px 0 24px 0;">
                                %s
                              </div>
                              <div style="margin:24px 0;">
                                <a href="%s" style="display:inline-block;padding:12px 24px;background-color:#1677FF;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;">%s</a>
                              </div>
                              <p style="font-size:12px;color:#64748B;margin-top:24px;line-height:1.5;">
                                If the button above does not work, copy and paste this link into your browser:<br/>
                                <a href="%s" style="color:#1677FF;">%s</a>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:16px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;text-align:center;">
                              This is an automated notification from the Fairmacs Learning Management System.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                safeTitle,
                safeTitle,
                accentColor,
                safeCategory,
                safePriority,
                safeRecipient,
                accentColor,
                safeMessage,
                safeUrl,
                safeCta,
                safeUrl,
                safeUrl
        );

        String text = """
                Fairmacs Learning Academy — %s (%s)
                ============================================================
                Hello %s,

                %s

                %s: %s

                ------------------------------------------------------------
                Automated message from the Fairmacs Learning Management System.
                """.formatted(
                notification.getTitle(),
                categoryBadge,
                recipientName,
                notification.getMessage(),
                ctaLabel,
                fullActionUrl
        );

        return new RenderedEmail(subject, html, text);
    }

    private String defaultActionPathForType(String type) {
        if (type == null) {
            return "/notifications";
        }
        return switch (type.toUpperCase()) {
            case NotificationType.CERTIFICATE_ISSUED -> "/certificates";
            case NotificationType.COURSE_COMPLETED,
                 NotificationType.COURSE_DUE_SOON,
                 NotificationType.COURSE_OVERDUE,
                 NotificationType.ASSIGNMENT_REVOKED,
                 NotificationType.DEADLINE_CHANGED -> "/progress";
            case NotificationType.TEAM_COMPLIANCE -> "/manager";
            case NotificationType.TRAINER_ACTION_REQUIRED -> "/trainer";
            case NotificationType.HR_ADMIN_ALERT,
                 NotificationType.SYSTEM_ALERT -> "/hr";
            default -> "/notifications";
        };
    }

    private String formatCategoryLabel(String type) {
        if (type == null) {
            return "LMS Notification";
        }
        return switch (type.toUpperCase()) {
            case NotificationType.COURSE_ASSIGNED -> "New Course Assignment";
            case NotificationType.COURSE_DUE_SOON -> "Course Deadline Reminder";
            case NotificationType.COURSE_OVERDUE -> "Overdue Course Alert";
            case NotificationType.COURSE_COMPLETED -> "Course Completed";
            case NotificationType.MODULE_COMPLETED -> "Module Completed";
            case NotificationType.QUIZ_AVAILABLE -> "Assessment Unlocked";
            case NotificationType.ASSESSMENT_RESULT -> "Assessment Passed";
            case NotificationType.ASSESSMENT_FAILED -> "Assessment Attempt Result";
            case NotificationType.RETAKE_AVAILABLE -> "Assessment Retake Available";
            case NotificationType.CERTIFICATE_ISSUED -> "Certificate Issued";
            case NotificationType.COURSE_CANCELLED -> "Course Cancelled";
            case NotificationType.ASSIGNMENT_REVOKED -> "Assignment Updated";
            case NotificationType.DEADLINE_CHANGED -> "Deadline Updated";
            case NotificationType.TRAINER_ACTION_REQUIRED -> "Trainer Action Required";
            case NotificationType.TEAM_COMPLIANCE -> "Team Compliance Update";
            case NotificationType.HR_ADMIN_ALERT -> "HR & Training Operations";
            case NotificationType.SYSTEM_ALERT -> "System Operational Alert";
            case NotificationType.GENERAL_ANNOUNCEMENT -> "Organization Announcement";
            default -> type.replace('_', ' ');
        };
    }

    private String formatCtaLabel(String type) {
        if (type == null) {
            return "Open Fairmacs LMS";
        }
        return switch (type.toUpperCase()) {
            case NotificationType.COURSE_ASSIGNED,
                 NotificationType.COURSE_DUE_SOON,
                 NotificationType.COURSE_OVERDUE,
                 NotificationType.MODULE_COMPLETED,
                 NotificationType.QUIZ_AVAILABLE,
                 NotificationType.RETAKE_AVAILABLE -> "Open Course";
            case NotificationType.CERTIFICATE_ISSUED -> "View & Download Certificate";
            case NotificationType.COURSE_COMPLETED -> "View Learning Progress";
            case NotificationType.TEAM_COMPLIANCE -> "Open Team Compliance Dashboard";
            case NotificationType.HR_ADMIN_ALERT,
                 NotificationType.SYSTEM_ALERT -> "Open HR Admin Console";
            case NotificationType.TRAINER_ACTION_REQUIRED -> "Open Trainer Workspace";
            default -> "View in Fairmacs LMS";
        };
    }

    private String resolveAccentColor(String type, String priority) {
        if (NotificationPriority.CRITICAL.equalsIgnoreCase(priority)
                || NotificationType.COURSE_OVERDUE.equalsIgnoreCase(type)
                || NotificationType.ASSESSMENT_FAILED.equalsIgnoreCase(type)) {
            return "#DC2626";
        }
        if (NotificationPriority.HIGH.equalsIgnoreCase(priority)
                || NotificationType.COURSE_DUE_SOON.equalsIgnoreCase(type)) {
            return "#D97706";
        }
        if (NotificationType.COURSE_COMPLETED.equalsIgnoreCase(type)
                || NotificationType.CERTIFICATE_ISSUED.equalsIgnoreCase(type)
                || NotificationType.ASSESSMENT_RESULT.equalsIgnoreCase(type)) {
            return "#059669";
        }
        return "#1677FF";
    }

    private String escapeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
