
package com.fairmacs.lms.integration.zoho;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ZohoOAuthService {

    private static final Logger log = LoggerFactory.getLogger(ZohoOAuthService.class);

    @Value("${zoho.client-id}")
    private String clientId;

    @Value("${zoho.client-secret}")
    private String clientSecret;

    @Value("${zoho.redirect-uri}")
    private String redirectUri;

    @Value("${zoho.accounts-url}")
    private String accountsUrl;

    @Value("${zoho.token-encryption-key:${ZOHO_TOKEN_ENCRYPTION_KEY:}}")
    private String encryptionKeyBase64;

    private final JdbcTemplate jdbcTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final SecureRandom secureRandom = new SecureRandom();

    private final Map<String, Instant> pendingStates =
            new ConcurrentHashMap<>();

    private volatile String accessToken;
    private volatile Instant accessTokenExpiresAt;
    private volatile String refreshToken;

    public ZohoOAuthService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initialize() {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) {
            return;
        }
        // Validate the encryption key at startup.
        encryptionKey();
        loadRefreshToken();
    }

    public String createAuthorizationUrl() {
        String state = UUID.randomUUID().toString();
        Instant expiry = Instant.now().plusSeconds(300);
        pendingStates.put(state, expiry);
        saveOAuthState(state, expiry);

        return UriComponentsBuilder
                .fromUriString(accountsUrl + "/oauth/v2/auth")
                .queryParam("client_id", clientId)
                .queryParam("response_type", "code")
                .queryParam("redirect_uri", redirectUri)
                .queryParam(
                        "scope",
                        "WorkDrive.files.READ,WorkDrive.files.CREATE,ZohoFiles.files.READ")
                .queryParam("access_type", "offline")
                // Ask for consent only during explicit connection/reconnection.
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .build()
                .encode()
                .toUriString();
    }

    public synchronized void exchangeCode(String code, String state) {
        Instant expiry = consumeOAuthState(state);

        if (expiry == null || !Instant.now().isBefore(expiry)) {
            throw new IllegalArgumentException(
                    "Invalid or expired Zoho OAuth state.");
        }

        MultiValueMap<String, String> form =
                new LinkedMultiValueMap<>();

        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        Map<?, ?> result = restTemplate.postForObject(
                accountsUrl + "/oauth/v2/token",
                new HttpEntity<>(form, formHeaders()),
                Map.class);

        if (result == null || result.get("access_token") == null) {
            throw new IllegalStateException(
                    "Zoho did not return an access token.");
        }

        Object newRefreshToken = result.get("refresh_token");

        if (newRefreshToken != null) {
            refreshToken = newRefreshToken.toString();
            saveEncryptedRefreshToken(refreshToken);
        } else if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException(
                    "Zoho did not return a refresh token. "
                    + "Reconnect with offline access enabled.");
        }

        setAccessToken(result);
    }

    /**
     * Use this method for every WorkDrive API request.
     * It refreshes the access token when it is about to expire.
     */
    public synchronized String getAccessToken() {
        if (accessToken != null
                && accessTokenExpiresAt != null
                && Instant.now().isBefore(
                        accessTokenExpiresAt.minusSeconds(60))) {
            return accessToken;
        }

        if (refreshToken == null || refreshToken.isBlank()) {
            loadRefreshToken();
        }

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException(
                    "Zoho WorkDrive is not connected. "
                    + "An HR Admin must connect it first.");
        }

        MultiValueMap<String, String> form =
                new LinkedMultiValueMap<>();

        form.add("grant_type", "refresh_token");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", refreshToken);

        Map<?, ?> result = restTemplate.postForObject(
                accountsUrl + "/oauth/v2/token",
                new HttpEntity<>(form, formHeaders()),
                Map.class);

        if (result == null || result.get("access_token") == null) {
            throw new IllegalStateException(
                    "Zoho access-token refresh failed.");
        }

        setAccessToken(result);
        return accessToken;
    }

    public boolean isConnected() {
        try {
            loadRefreshToken();
            return refreshToken != null && !refreshToken.isBlank();
        } catch (Exception ex) {
            return false;
        }
    }

    private void saveOAuthState(String state, Instant expiry) {
        if (jdbcTemplate == null) {
            return;
        }
        try {
            jdbcTemplate.update("DELETE FROM zoho_oauth_states WHERE expires_at < NOW()");
            jdbcTemplate.update(
                    "INSERT INTO zoho_oauth_states (state, expires_at, created_at) VALUES (?, ?, NOW()) ON CONFLICT (state) DO UPDATE SET expires_at = EXCLUDED.expires_at",
                    state,
                    java.sql.Timestamp.from(expiry)
            );
        } catch (Exception ignored) {
            // Fallback to in-memory pendingStates if table is unavailable in unit-test context
        }
    }

    private Instant consumeOAuthState(String state) {
        if (state == null || state.isBlank()) {
            return null;
        }
        Instant inMemoryExpiry = pendingStates.remove(state);
        if (jdbcTemplate != null) {
            try {
                var rows = jdbcTemplate.query(
                        "SELECT expires_at FROM zoho_oauth_states WHERE state = ?",
                        (rs, rowNum) -> {
                            java.sql.Timestamp ts = rs.getTimestamp(1);
                            return ts != null ? ts.toInstant() : null;
                        },
                        state
                );
                jdbcTemplate.update("DELETE FROM zoho_oauth_states WHERE state = ? OR expires_at < NOW()", state);
                if (!rows.isEmpty() && rows.get(0) != null) {
                    return rows.get(0);
                }
            } catch (Exception ignored) {
                // Fallback to inMemoryExpiry
            }
        }
        return inMemoryExpiry;
    }

    private void setAccessToken(Map<?, ?> result) {
        accessToken = result.get("access_token").toString();

        Object expiresIn = result.get("expires_in");
        long seconds = expiresIn instanceof Number
                ? ((Number) expiresIn).longValue()
                : 3600L;

        accessTokenExpiresAt = Instant.now().plusSeconds(seconds);
    }

    private void saveEncryptedRefreshToken(String token) {
        String encrypted = encrypt(token);

        jdbcTemplate.update("""
                INSERT INTO public.zoho_integration_credentials
                    (id, refresh_token_encrypted, updated_at)
                VALUES (1, ?, NOW())
                ON CONFLICT (id)
                DO UPDATE SET
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    updated_at = NOW()
                """, encrypted);
    }

    private void loadRefreshToken() {
        var tokens = jdbcTemplate.query(
                """
                SELECT refresh_token_encrypted
                FROM public.zoho_integration_credentials
                WHERE id = 1
                """,
                (rs, rowNum) -> rs.getString(1));

        if (!tokens.isEmpty()) {
            try {
                refreshToken = decrypt(tokens.get(0));
            } catch (Exception e) {
                log.warn("Could not decrypt stored Zoho refresh token at startup (key mismatch or unconfigured): {}", e.getMessage());
                refreshToken = null;
            }
        }
    }

    private String encrypt(String plainText) {
        try {
            byte[] iv = new byte[12];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.ENCRYPT_MODE,
                    encryptionKey(),
                    new GCMParameterSpec(128, iv));

            byte[] encrypted = cipher.doFinal(
                    plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(
                    encrypted, 0, combined, iv.length, encrypted.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Could not encrypt Zoho credentials.", ex);
        }
    }

    private String decrypt(String encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] iv = java.util.Arrays.copyOfRange(combined, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(
                    combined, 12, combined.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    encryptionKey(),
                    new GCMParameterSpec(128, iv));

            return new String(
                    cipher.doFinal(encrypted),
                    StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Could not decrypt Zoho credentials. "
                    + "Check that ZOHO_TOKEN_ENCRYPTION_KEY "
                    + "has not changed.", ex);
        }
    }

    private SecretKeySpec encryptionKey() {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) {
            throw new IllegalStateException(
                    "ZOHO_TOKEN_ENCRYPTION_KEY must be configured as a Base64 "
                    + "encoding of exactly 32 random bytes.");
        }
        byte[] key = Base64.getDecoder().decode(encryptionKeyBase64);

        if (key.length != 32) {
            throw new IllegalStateException(
                    "ZOHO_TOKEN_ENCRYPTION_KEY must be Base64 "
                    + "encoding of exactly 32 random bytes.");
        }

        return new SecretKeySpec(key, "AES");
    }

    private HttpHeaders formHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        return headers;
    }
}
