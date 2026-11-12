package com.fairmacs.lms.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String PLACEHOLDER_SECRET = "your_jwt_secret_key_minimum_256_bits_length";
    private static final int MIN_SECRET_BYTES = 32;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    public JwtService() {
    }

    public JwtService(String jwtSecret, long jwtExpiration) {
        this.jwtSecret = jwtSecret;
        this.jwtExpiration = jwtExpiration;
        validateConfiguration();
    }

    @PostConstruct
    public void validateConfiguration() {
        if (jwtSecret == null || jwtSecret.trim().isEmpty()) {
            throw new IllegalStateException("JWT secret (jwt.secret) must be configured and non-empty.");
        }
        String trimmed = jwtSecret.trim();
        if (PLACEHOLDER_SECRET.equalsIgnoreCase(trimmed)) {
            throw new IllegalStateException("JWT secret (jwt.secret) must not use the example placeholder value.");
        }
        byte[] keyBytes = trimmed.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT secret (jwt.secret) must be at least 256 bits (32 bytes) long.");
        }
        if (jwtExpiration <= 0) {
            throw new IllegalStateException("JWT expiration (jwt.expiration) must be a positive duration in milliseconds.");
        }
    }

    // ============================================================
    // SIGNING KEY
    // ============================================================

    private SecretKey getSigningKey() {
        validateConfiguration();
        return Keys.hmacShaKeyFor(jwtSecret.trim().getBytes(StandardCharsets.UTF_8));
    }

    // ============================================================
    // GENERATE TOKEN
    // ============================================================

    public String generateToken(String username, Map<String, Object> extraClaims) {
        return Jwts.builder()
                .claims(extraClaims != null ? extraClaims : new HashMap<>())
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String generateToken(String username) {
        return generateToken(username, new HashMap<>());
    }

    // ============================================================
    // EXTRACT CLAIMS
    // ============================================================

    public Claims extractClaims(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("JWT token is empty.");
        }

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token.trim())
                .getPayload();
    }

    // ============================================================
    // EXTRACT USERNAME
    // ============================================================

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    // ============================================================
    // VALIDATE TOKEN
    // ============================================================

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractClaims(token);
            Date expiration = claims.getExpiration();

            if (expiration == null) {
                log.debug("JWT validation failed: expiration claim is missing.");
                return false;
            }

            if (expiration.before(new Date())) {
                log.debug("JWT validation failed: token has expired.");
                return false;
            }

            return true;
        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getClass().getSimpleName());
            return false;
        }
    }
}
