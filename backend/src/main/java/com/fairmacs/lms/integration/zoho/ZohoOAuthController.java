
package com.fairmacs.lms.integration.zoho;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


import java.util.Map;

@RestController
@RequestMapping("/api/integrations/zoho")
public class ZohoOAuthController {

    private final ZohoOAuthService zohoOAuthService;

    public ZohoOAuthController(ZohoOAuthService zohoOAuthService) {
        this.zohoOAuthService = zohoOAuthService;
    }

    @GetMapping("/connect-url")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, String>> connectUrl() {
        String authorizationUrl =
                zohoOAuthService.createAuthorizationUrl();

        return ResponseEntity.ok(
                Map.of("authorizationUrl", authorizationUrl)
        );
    }

    @GetMapping("/callback")
    public ResponseEntity<String> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {

        if (error != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Zoho authorization was declined or failed.");
        }

        if (code == null || code.isBlank()
                || state == null || state.isBlank()) {
            return ResponseEntity.badRequest()
                    .body("Missing OAuth authorization parameters.");
        }

        try {
            zohoOAuthService.exchangeCode(code, state);

            return ResponseEntity.ok(
                    "Zoho WorkDrive authorization succeeded. "
                    + "Return to the Fairmacs KMS."
            );
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Zoho authorization failed. "
                            + "Check backend logs.");
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
}
