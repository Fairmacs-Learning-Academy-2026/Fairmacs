package com.fairmacs.lms.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.UserRepository;

@Component
public class SecurityContextUtil {

    private final UserRepository userRepository;

    public SecurityContextUtil(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        return principal instanceof String ? (String) principal : null;
    }

    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.getDetails() instanceof JwtAuthenticationFilter.CurrentJwtClaims claims) {
            return claims.getUserId();
        }

        User user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    public String getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getDetails() instanceof JwtAuthenticationFilter.CurrentJwtClaims claims) {
            return claims.getRole();
        }
        User user = getCurrentUser();
        return user != null ? user.getRole().name() : null;
    }

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        if (authentication.getDetails() instanceof JwtAuthenticationFilter.CurrentJwtClaims claims) {
            Long userId = claims.getUserId();
            if (userId != null) {
                return userRepository.findById(userId).orElse(null);
            }
        }

        String username = getCurrentUsername();
        if (username == null) {
            return null;
        }

        return userRepository.findByEmailOrEmployeeIdIgnoreCase(username)
                .or(() -> userRepository.findByEmail(username))
                .orElse(null);
    }

    public boolean hasRole(Role role) {
        String currentRole = getCurrentUserRole();
        return currentRole != null && currentRole.equalsIgnoreCase(role.name());
    }

    public boolean isManagerOrHr() {
        String role = getCurrentUserRole();
        return Role.MANAGER.name().equalsIgnoreCase(role) || Role.HR_ADMIN.name().equalsIgnoreCase(role);
    }
}
