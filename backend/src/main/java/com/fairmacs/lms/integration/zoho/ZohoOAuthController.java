
package com.fairmacs.lms.integration.zoho;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.HtmlUtils;

import java.util.Map;

@RestController
@RequestMapping({"/api/integrations/zoho", "/api/zoho"})
public class ZohoOAuthController {

    private final ZohoOAuthService zohoOAuthService;

    @Value("${app.notifications.frontend-base-url:http://localhost:5173}")
    private String defaultFrontendBaseUrl;

    public ZohoOAuthController(ZohoOAuthService zohoOAuthService) {
        this.zohoOAuthService = zohoOAuthService;
    }

    @GetMapping({"/connect-url", "/auth-url"})
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, String>> connectUrl(
            @RequestParam(required = false) String origin) {
        String authorizationUrl =
                zohoOAuthService.createAuthorizationUrl(origin);

        return ResponseEntity.ok(
                Map.of(
                        "authorizationUrl", authorizationUrl,
                        "url", authorizationUrl
                )
        );
    }

    @GetMapping(value = "/callback", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {

        String frontendOrigin = zohoOAuthService.getFrontendOriginForState(state);
        String dashboardUrl = resolveDashboardUrl(frontendOrigin);

        if (error != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(renderErrorHtml("Zoho authorization was declined: " + HtmlUtils.htmlEscape(error), dashboardUrl));
        }

        if (code == null || code.isBlank()
                || state == null || state.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(renderErrorHtml("Missing OAuth authorization parameters from Zoho.", dashboardUrl));
        }

        try {
            zohoOAuthService.exchangeCode(code, state);

            return ResponseEntity.ok(renderSuccessHtml(dashboardUrl));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(renderErrorHtml("Zoho authorization failed: " + HtmlUtils.htmlEscape(ex.getMessage()), dashboardUrl));
        }
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(
                Map.of(
                        "connected", zohoOAuthService.isConnected(),
                        "message", zohoOAuthService.isConnected()
                                ? "Zoho authorization completed in this running instance."
                                : "Zoho WorkDrive is not connected."
                )
        );
    }

    private String resolveDashboardUrl(String origin) {
        String base = (origin != null && !origin.isBlank()) ? origin.trim() : defaultFrontendBaseUrl;
        if (base == null || base.isBlank()) {
            base = "http://localhost:5173";
        }
        base = base.replaceAll("/+$", "");
        if (!base.startsWith("http://") && !base.startsWith("https://")) {
            base = "http://localhost:5173";
        }
        return base + "/dashboard";
    }

    private String renderSuccessHtml(String dashboardUrl) {
        String escapedUrl = HtmlUtils.htmlEscape(dashboardUrl);
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zoho WorkDrive Connected | Fairmacs KMS</title>
                <meta http-equiv="refresh" content="3;url=%s">
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background: linear-gradient(135deg, #F8FAFC 0%%, #EFF6FF 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 1.5rem;
                        color: #0F172A;
                    }
                    .card {
                        background: #FFFFFF;
                        border: 1px solid #E2E8F0;
                        border-radius: 20px;
                        box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
                        max-width: 480px;
                        width: 100%;
                        padding: 2.75rem 2.25rem;
                        text-align: center;
                        animation: fadeIn 0.4s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .icon-wrap {
                        width: 68px;
                        height: 68px;
                        border-radius: 50%;
                        background: #DCFCE7;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 0 0 8px #F0FDF4;
                    }
                    .badge {
                        display: inline-block;
                        font-size: 0.75rem;
                        font-weight: 600;
                        letter-spacing: 0.05em;
                        text-transform: uppercase;
                        color: #0F6CBD;
                        background: #F0F7FF;
                        padding: 0.35rem 0.75rem;
                        border-radius: 9999px;
                        margin-bottom: 0.75rem;
                        border: 1px solid #BAE6FD;
                    }
                    h1 {
                        font-size: 1.45rem;
                        font-weight: 700;
                        color: #0F172A;
                        margin-bottom: 0.75rem;
                        line-height: 1.3;
                    }
                    p {
                        font-size: 0.95rem;
                        color: #475569;
                        line-height: 1.55;
                        margin-bottom: 1.75rem;
                    }
                    .btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        width: 100%%;
                        background: #0F6CBD;
                        color: #FFFFFF;
                        text-decoration: none;
                        padding: 0.85rem 1.25rem;
                        border-radius: 10px;
                        font-size: 0.95rem;
                        font-weight: 600;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 6px -1px rgba(15, 108, 189, 0.25);
                        cursor: pointer;
                        border: none;
                    }
                    .btn:hover {
                        background: #0D5C9E;
                        transform: translateY(-1px);
                        box-shadow: 0 6px 10px -1px rgba(15, 108, 189, 0.35);
                    }
                    .countdown {
                        margin-top: 1.25rem;
                        font-size: 0.85rem;
                        color: #64748B;
                    }
                    .countdown strong {
                        color: #0F172A;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon-wrap">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div><span class="badge">Fairmacs KMS · Cloud Storage</span></div>
                    <h1>Zoho WorkDrive Connected</h1>
                    <p>Authorization succeeded! Your corporate Zoho WorkDrive integration is active and ready to stream documents.</p>
                    <a href="%s" class="btn" id="returnBtn">
                        <span>Return to Dashboard</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                    <div class="countdown">
                        Redirecting to your dashboard in <strong id="timer">3</strong> seconds...
                    </div>
                </div>
                <script>
                    var targetUrl = "%s";
                    var count = 3;
                    var timerSpan = document.getElementById("timer");
                    var timer = setInterval(function() {
                        count--;
                        if (timerSpan) timerSpan.textContent = count;
                        if (count <= 0) {
                            clearInterval(timer);
                            window.location.href = targetUrl;
                        }
                    }, 1000);
                </script>
            </body>
            </html>
            """.formatted(escapedUrl, escapedUrl, escapedUrl);
    }

    private String renderErrorHtml(String errorMessage, String dashboardUrl) {
        String escapedUrl = HtmlUtils.htmlEscape(dashboardUrl);
        String escapedMsg = HtmlUtils.htmlEscape(errorMessage);
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zoho WorkDrive Connection Issue | Fairmacs KMS</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background: linear-gradient(135deg, #F8FAFC 0%%, #FEF2F2 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 1.5rem;
                        color: #0F172A;
                    }
                    .card {
                        background: #FFFFFF;
                        border: 1px solid #FEE2E2;
                        border-radius: 20px;
                        box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
                        max-width: 480px;
                        width: 100%%;
                        padding: 2.75rem 2.25rem;
                        text-align: center;
                        animation: fadeIn 0.4s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .icon-wrap {
                        width: 68px;
                        height: 68px;
                        border-radius: 50%;
                        background: #FEE2E2;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 1.5rem;
                        box-shadow: 0 0 0 8px #FEF2F2;
                    }
                    .badge {
                        display: inline-block;
                        font-size: 0.75rem;
                        font-weight: 600;
                        letter-spacing: 0.05em;
                        text-transform: uppercase;
                        color: #DC2626;
                        background: #FEF2F2;
                        padding: 0.35rem 0.75rem;
                        border-radius: 9999px;
                        margin-bottom: 0.75rem;
                        border: 1px solid #FECACA;
                    }
                    h1 {
                        font-size: 1.45rem;
                        font-weight: 700;
                        color: #0F172A;
                        margin-bottom: 0.75rem;
                        line-height: 1.3;
                    }
                    p {
                        font-size: 0.95rem;
                        color: #64748B;
                        line-height: 1.55;
                        margin-bottom: 1.75rem;
                    }
                    .btn {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        width: 100%%;
                        background: #0F6CBD;
                        color: #FFFFFF;
                        text-decoration: none;
                        padding: 0.85rem 1.25rem;
                        border-radius: 10px;
                        font-size: 0.95rem;
                        font-weight: 600;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 6px -1px rgba(15, 108, 189, 0.25);
                        cursor: pointer;
                        border: none;
                    }
                    .btn:hover {
                        background: #0D5C9E;
                        transform: translateY(-1px);
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon-wrap">
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <div><span class="badge">Fairmacs KMS · Authorization Error</span></div>
                    <h1>Zoho Authorization Incomplete</h1>
                    <p>%s</p>
                    <a href="%s" class="btn">
                        <span>Return to Dashboard</span>
                    </a>
                </div>
            </body>
            </html>
            """.formatted(escapedMsg, escapedUrl);
    }
}
