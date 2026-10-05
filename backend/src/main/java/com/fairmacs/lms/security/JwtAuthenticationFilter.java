package com.fairmacs.lms.security;

import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.UserRepository;

import io.jsonwebtoken.Claims;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public JwtAuthenticationFilter(
            UserRepository userRepository,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        /*
         * No Authorization header.
         *
         * Let Spring Security handle the request.
         */
        if (authHeader == null ||
                !authHeader.startsWith("Bearer ")) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        String token =
                authHeader.substring(7).trim();

        /*
         * Empty token.
         */
        if (token.isEmpty()) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }

        try {

            // =====================================================
            // 1. VALIDATE TOKEN USING JwtService
            // =====================================================

            if (!jwtService.isTokenValid(token)) {

                logger.warn(
                        "Rejected invalid or expired JWT for request: "
                                + request.getRequestURI()
                );

                SecurityContextHolder.clearContext();

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }


            // =====================================================
            // 2. EXTRACT JWT CLAIMS
            // =====================================================

            Claims claims =
                    jwtService.extractClaims(token);

            String username =
                    claims.getSubject();

            if (username == null ||
                    username.trim().isEmpty()) {

                logger.warn(
                        "JWT does not contain a subject."
                );

                SecurityContextHolder.clearContext();

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }


            username =
                    username.trim();


            // =====================================================
            // 3. FIND USER FROM DATABASE
            // =====================================================

            Optional<User> userOptional =
                    userRepository
                            .findByEmailOrEmployeeIdIgnoreCase(
                                    username
                            );

            if (userOptional.isEmpty()) {

                logger.warn(
                        "JWT user not found in database: "
                                + username
                );

                SecurityContextHolder.clearContext();

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }

            User user =
                    userOptional.get();


            // =====================================================
            // 4. CHECK ACCOUNT STATUS
            // =====================================================

            if (user.getStatus() != UserStatus.ACTIVE) {

                logger.warn(
                        "Blocked authentication attempt for inactive user: "
                                + username
                );

                SecurityContextHolder.clearContext();

                filterChain.doFilter(
                        request,
                        response
                );

                return;
            }


            // =====================================================
            // 5. USE DATABASE ROLE
            // =====================================================

            String role =
                    user.getRole().name();

            List<GrantedAuthority> authorities =
                    new ArrayList<>();

            authorities.add(
                    new SimpleGrantedAuthority(
                            "ROLE_" + role
                    )
            );


            // =====================================================
            // 6. GET USER ID
            // =====================================================

            Long userId =
                    user.getId();


            /*
             * If userId exists in the JWT, use it.
             * Otherwise fall back to the database ID.
             */
            Object userIdClaim =
                    claims.get("userId");

            if (userIdClaim instanceof Number) {

                userId =
                        ((Number) userIdClaim)
                                .longValue();
            }


            // =====================================================
            // 7. CREATE JWT DETAILS
            // =====================================================

            CurrentJwtClaims claimsDetails =
                    new CurrentJwtClaims(
                            userId,
                            role,
                            request.getRemoteAddr(),
                            request.getRequestedSessionId()
                    );


            // =====================================================
            // 8. CREATE AUTHENTICATION
            // =====================================================

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            authorities
                    );

            authentication.setDetails(
                    claimsDetails
            );


            // =====================================================
            // 9. STORE AUTHENTICATION IN SECURITY CONTEXT
            // =====================================================

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(
                            authentication
                    );

            logger.debug(
                    "JWT authentication successful for user: "
                            + username
                            + " with role: "
                            + role
            );

        } catch (Exception e) {

            /*
             * IMPORTANT:
             *
             * Do not create an authentication object when
             * JWT validation fails.
             */
            SecurityContextHolder.clearContext();

            logger.error(
                    "JWT authentication failed for request: "
                            + request.getRequestURI(),
                    e
            );
        }


        // =========================================================
        // CONTINUE REQUEST
        // =========================================================

        filterChain.doFilter(
                request,
                response
        );
    }


    // ============================================================
    // CURRENT JWT CLAIMS
    // ============================================================

    public static class CurrentJwtClaims {

        private final Long userId;
        private final String role;
        private final String remoteAddress;
        private final String sessionId;

        public CurrentJwtClaims(
                Long userId,
                String role,
                String remoteAddress,
                String sessionId) {

            this.userId = userId;
            this.role = role;
            this.remoteAddress = remoteAddress;
            this.sessionId = sessionId;
        }

        public Long getUserId() {
            return userId;
        }

        public String getRole() {
            return role;
        }

        public String getRemoteAddress() {
            return remoteAddress;
        }

        public String getSessionId() {
            return sessionId;
        }
    }
}