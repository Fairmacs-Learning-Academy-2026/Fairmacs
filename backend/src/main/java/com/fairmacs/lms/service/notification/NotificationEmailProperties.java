package com.fairmacs.lms.service.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the Fairmacs LMS Email Notification Channel.
 *
 * IMPORTANT: Email delivery is DISABLED by default (app.notifications.email.enabled=false).
 * The application starts and runs normally without any Zoho SMTP or ZeptoMail credentials.
 */
@Component
public class NotificationEmailProperties {

    @Value("${app.notifications.email.enabled:false}")
    private boolean enabled = false;

    @Value("${app.notifications.email.provider:ZEPTOMAIL}")
    private String provider = "ZEPTOMAIL";

    @Value("${app.notifications.email.from-address:no-reply@fairmacs.com}")
    private String fromAddress = "no-reply@fairmacs.com";

    @Value("${app.notifications.email.from-name:Fairmacs Learning Hub}")
    private String fromName = "Fairmacs Learning Hub";

    @Value("${app.notifications.email.reply-to:hr-training@fairmacs.com}")
    private String replyTo = "hr-training@fairmacs.com";

    @Value("${app.notifications.email.zeptomail.api-url:https://api.zeptomail.in/v1.1/email}")
    private String zeptoMailApiUrl = "https://api.zeptomail.in/v1.1/email";

    @Value("${app.notifications.email.zeptomail.send-token:}")
    private String zeptoMailSendToken = "";

    @Value("${app.notifications.email.smtp.host:smtp.zoho.in}")
    private String smtpHost = "smtp.zoho.in";

    @Value("${app.notifications.email.smtp.port:587}")
    private int smtpPort = 587;

    @Value("${app.notifications.email.smtp.username:}")
    private String smtpUsername = "";

    @Value("${app.notifications.email.smtp.password:}")
    private String smtpPassword = "";

    @Value("${app.notifications.email.max-retries:3}")
    private int maxRetries = 3;

    @Value("${app.notifications.email.connect-timeout-seconds:10}")
    private int connectTimeoutSeconds = 10;

    @Value("${app.notifications.email.request-timeout-seconds:15}")
    private int requestTimeoutSeconds = 15;

    @Value("${app.notifications.email.base-backoff-seconds:30}")
    private int baseBackoffSeconds = 30;

    @Value("${app.notifications.email.poll-interval-ms:30000}")
    private long pollIntervalMs = 30000;

    @Value("${app.notifications.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl = "http://localhost:5173";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getFromAddress() {
        return fromAddress;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }

    public String getReplyTo() {
        return replyTo;
    }

    public void setReplyTo(String replyTo) {
        this.replyTo = replyTo;
    }

    public String getZeptoMailApiUrl() {
        return zeptoMailApiUrl;
    }

    public void setZeptoMailApiUrl(String zeptoMailApiUrl) {
        this.zeptoMailApiUrl = zeptoMailApiUrl;
    }

    public String getZeptoMailSendToken() {
        return zeptoMailSendToken;
    }

    public void setZeptoMailSendToken(String zeptoMailSendToken) {
        this.zeptoMailSendToken = zeptoMailSendToken;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public int getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(int smtpPort) {
        this.smtpPort = smtpPort;
    }

    public String getSmtpUsername() {
        return smtpUsername;
    }

    public void setSmtpUsername(String smtpUsername) {
        this.smtpUsername = smtpUsername;
    }

    public String getSmtpPassword() {
        return smtpPassword;
    }

    public void setSmtpPassword(String smtpPassword) {
        this.smtpPassword = smtpPassword;
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
        this.maxRetries = maxRetries;
    }

    public int getConnectTimeoutSeconds() {
        return connectTimeoutSeconds;
    }

    public void setConnectTimeoutSeconds(int connectTimeoutSeconds) {
        this.connectTimeoutSeconds = connectTimeoutSeconds;
    }

    public int getRequestTimeoutSeconds() {
        return requestTimeoutSeconds;
    }

    public void setRequestTimeoutSeconds(int requestTimeoutSeconds) {
        this.requestTimeoutSeconds = requestTimeoutSeconds;
    }

    public int getBaseBackoffSeconds() {
        return baseBackoffSeconds;
    }

    public void setBaseBackoffSeconds(int baseBackoffSeconds) {
        this.baseBackoffSeconds = baseBackoffSeconds;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public String getFrontendBaseUrl() {
        return frontendBaseUrl;
    }

    public void setFrontendBaseUrl(String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }
}

