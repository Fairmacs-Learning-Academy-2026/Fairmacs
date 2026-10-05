package com.fairmacs.lms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;


    // ============================================================
    // SIGNING KEY
    // ============================================================

    private SecretKey getSigningKey() {

        if (jwtSecret == null ||
                jwtSecret.trim().isEmpty()) {

            throw new IllegalStateException(
                    "JWT secret is missing."
            );
        }

        return Keys.hmacShaKeyFor(
                jwtSecret.getBytes(
                        StandardCharsets.UTF_8
                )
        );
    }


    // ============================================================
    // GENERATE TOKEN
    // ============================================================

    public String generateToken(
            String username,
            Map<String, Object> extraClaims) {

        return Jwts.builder()
                .claims(
                        extraClaims != null
                                ? extraClaims
                                : new HashMap<>()
                )
                .subject(username)
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + jwtExpiration
                        )
                )
                .signWith(
                        getSigningKey()
                )
                .compact();
    }


    // ============================================================
    // GENERATE TOKEN
    // ============================================================

    public String generateToken(
            String username) {

        return generateToken(
                username,
                new HashMap<>()
        );
    }


    // ============================================================
    // EXTRACT CLAIMS
    // ============================================================

    public Claims extractClaims(
            String token) {

        if (token == null ||
                token.trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "JWT token is empty."
            );
        }

        return Jwts.parser()
                .verifyWith(
                        getSigningKey()
                )
                .build()
                .parseSignedClaims(
                        token.trim()
                )
                .getPayload();
    }


    // ============================================================
    // EXTRACT USERNAME
    // ============================================================

    public String extractUsername(
            String token) {

        return extractClaims(
                token
        ).getSubject();
    }


    // ============================================================
    // VALIDATE TOKEN
    // ============================================================

    public boolean isTokenValid(
            String token) {

        try {

            Claims claims =
                    extractClaims(token);

            Date expiration =
                    claims.getExpiration();

            if (expiration == null) {

                System.err.println(
                        "JWT validation failed: expiration claim is missing."
                );

                return false;
            }

            if (expiration.before(new Date())) {

                System.err.println(
                        "JWT validation failed: token has expired."
                );

                return false;
            }

            return true;

        } catch (Exception e) {

            /*
             * IMPORTANT:
             * Print the REAL reason instead of hiding it.
             */
            System.err.println(
                    "JWT validation failed: "
                            + e.getClass().getSimpleName()
                            + " - "
                            + e.getMessage()
            );

            return false;
        }
    }
}