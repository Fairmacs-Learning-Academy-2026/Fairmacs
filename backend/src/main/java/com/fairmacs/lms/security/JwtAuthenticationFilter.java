package com.fairmacs.lms.security;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.UserRepository;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

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

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 1. Validate JWT signature and expiration
            if (!jwtService.isTokenValid(token)) {
                logger.debug("Rejected invalid or expired JWT for request: " + request.getRequestURI());
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 2. Extract claims
            Claims claims = jwtService.extractClaims(token);
            String username = claims.getSubject();

            if (username == null || username.trim().isEmpty()) {
                logger.debug("JWT does not contain a subject.");
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }
            username = username.trim();

            // 3. Load authoritative user from database
            Optional<User> userOptional = userRepository.findByEmailOrEmployeeIdIgnoreCase(username);
            if (userOptional.isEmpty()) {
                logger.debug("JWT subject not found in database.");
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            User user = userOptional.get();

            // 4. Verify account status and lockout state
            if (user.getStatus() != UserStatus.ACTIVE) {
                logger.debug("Blocked token usage for non-active user ID: " + user.getId());
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            if (user.getLockedUntil() != null && LocalDateTime.now().isBefore(user.getLockedUntil())) {
                logger.debug("Blocked token usage for temporarily locked user ID: " + user.getId());
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 5. Verify userId claim matches authoritative database ID (if present)
            Long userId = user.getId();
            Object userIdClaim = claims.get("userId");
            if (userIdClaim instanceof Number) {
                long claimedId = ((Number) userIdClaim).longValue();
                if (userId != null && claimedId != userId.longValue()) {
                    logger.warn("Rejected JWT due to userId claim mismatch for user ID: " + userId);
                    SecurityContextHolder.clearContext();
                    filterChain.doFilter(request, response);
                    return;
                }
            }

            // 6. Verify token was not issued prior to the user's most recent password change
            if (isTokenInvalidatedByPasswordChange(claims, user)) {
                logger.debug("Rejected JWT issued prior to password change for user ID: " + userId);
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }

            // 7. Server-side enforcement of mandatory first-login / temporary password change
            if (Boolean.TRUE.equals(user.getMustChangePassword()) && !isAllowedDuringPasswordChangeLock(request)) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write(
                        "{\"success\":false,\"error\":\"PASSWORD_CHANGE_REQUIRED\",\"mustChangePassword\":true,"
                                + "\"message\":\"You must change your temporary password before accessing the LMS.\"}"
                );
                return;
            }

            // 8. Always derive role and userId from the authoritative database record
            String role = user.getRole().name();
            List<GrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));

            CurrentJwtClaims claimsDetails = new CurrentJwtClaims(
                    userId,
                    role,
                    request.getRemoteAddr(),
                    request.getRequestedSessionId()
            );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            authorities
                    );
            authentication.setDetails(claimsDetails);

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            logger.debug("JWT authentication failed for request: " + request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

    private boolean isTokenInvalidatedByPasswordChange(Claims claims, User user) {
        LocalDateTime pwdChangedAt = user.getPasswordChangedAt();
        if (pwdChangedAt == null) {
            return false;
        }

        long userPwdChangedMillis = pwdChangedAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        Object tokenPwdChangedClaim = claims.get("pwdChangedAt");
        if (tokenPwdChangedClaim instanceof Number) {
            long tokenPwdChangedMillis = ((Number) tokenPwdChangedClaim).longValue();
            return tokenPwdChangedMillis < userPwdChangedMillis;
        }

        Date issuedAt = claims.getIssuedAt();
        if (issuedAt == null) {
            return true;
        }
        Instant pwdChangedInstantSeconds = pwdChangedAt
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .truncatedTo(ChronoUnit.SECONDS);
        return issuedAt.toInstant().isBefore(pwdChangedInstantSeconds);
    }

    private boolean isAllowedDuringPasswordChangeLock(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) {
            return false;
        }
        String method = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        return uri.endsWith("/api/auth/change-password")
                || uri.endsWith("/api/auth/me")
                || uri.endsWith("/api/auth/logout");
    }

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
