package com.fairmacs.lms.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.fairmacs.lms.dto.LoginRequest;
import com.fairmacs.lms.dto.LoginResponse;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.JwtService;
import com.fairmacs.lms.security.LoginAttemptService;
import com.fairmacs.lms.security.PasswordSecurityUtil;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    public static final String GENERIC_LOGIN_ERROR = "Invalid Employee ID / Email or Password.";

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;

    @Autowired
    public UserService(
            UserRepository userRepository,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
    }

    public UserService(
            UserRepository userRepository,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder) {
        this(
                userRepository,
                jwtService,
                authenticationManager,
                passwordEncoder,
                new LoginAttemptService(5, 20, 15, 10000)
        );
    }

    public LoginResponse login(LoginRequest request) {
        return login(request, null);
    }

    public LoginResponse login(LoginRequest request, String clientIp) {
        if (request == null || request.getLoginId() == null || request.getLoginId().trim().isEmpty()) {
            throw new IllegalArgumentException("Login ID is required.");
        }

        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password is required.");
        }

        String loginId = request.getLoginId().trim();

        if (loginAttemptService != null && loginAttemptService.isBlocked(loginId, clientIp)) {
            throw new BadCredentialsException(GENERIC_LOGIN_ERROR);
        }

        Optional<User> candidateOpt = userRepository.findByEmailOrEmployeeIdIgnoreCase(loginId);
        if (candidateOpt.isPresent()) {
            User candidate = candidateOpt.get();
            if (candidate.getLockedUntil() != null && LocalDateTime.now().isBefore(candidate.getLockedUntil())) {
                if (loginAttemptService != null) {
                    loginAttemptService.recordFailedAttempt(loginId, clientIp);
                }
                throw new BadCredentialsException(GENERIC_LOGIN_ERROR);
            }
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginId, request.getPassword())
            );
        } catch (AuthenticationException ex) {
            handleFailedLogin(loginId, clientIp, candidateOpt.orElse(null));
            throw new BadCredentialsException(GENERIC_LOGIN_ERROR);
        }

        User user = candidateOpt
                .or(() -> userRepository.findByEmailOrEmployeeIdIgnoreCase(loginId))
                .orElseThrow(() -> {
                    handleFailedLogin(loginId, clientIp, null);
                    return new BadCredentialsException(GENERIC_LOGIN_ERROR);
                });

        if (user.getStatus() != UserStatus.ACTIVE) {
            log.warn("Rejected login attempt for inactive account ID: {}", user.getId());
            if (loginAttemptService != null) {
                loginAttemptService.recordFailedAttempt(loginId, clientIp);
            }
            throw new BadCredentialsException(GENERIC_LOGIN_ERROR);
        }

        if (loginAttemptService != null) {
            loginAttemptService.recordSuccessfulLogin(loginId, clientIp);
        }
        if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        return buildLoginResponse(user, true);
    }

    private void handleFailedLogin(String loginId, String clientIp, User user) {
        if (loginAttemptService != null) {
            loginAttemptService.recordFailedAttempt(loginId, clientIp);
        }
        if (user != null) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepository.save(user);
        }
    }

    /**
     * Verifies the authenticated user's current password, validates the new
     * password against complexity rules, stores the new BCrypt hash, clears
     * mustChangePassword, updates passwordChangedAt to invalidate old JWTs,
     * and returns a freshly minted LoginResponse with a rotated JWT.
     */
    public LoginResponse changePassword(
            Long userId,
            String currentPassword,
            String newPassword) {

        if (userId == null) {
            throw new BadCredentialsException("Authentication is required.");
        }

        if (currentPassword == null || currentPassword.isBlank()) {
            throw new IllegalArgumentException("Current password is required.");
        }

        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password is required.");
        }

        PasswordSecurityUtil.validatePasswordStrength(newPassword);

        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password does not match.");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from the current password.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);

        LocalDateTime now = LocalDateTime.now();
        if (user.getPasswordChangedAt() != null && !now.isAfter(user.getPasswordChangedAt())) {
            now = user.getPasswordChangedAt().plusNanos(1_000_000);
        }
        user.setPasswordChangedAt(now);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);

        User saved = userRepository.save(user);
        log.info("Password changed successfully for user ID: {}", saved.getId());

        return buildLoginResponse(saved, true);
    }

    public LoginResponse getCurrentUserProfile(Long userId) {
        if (userId == null) {
            throw new BadCredentialsException("Authentication is required.");
        }
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return buildLoginResponse(user, false);
    }

    private LoginResponse buildLoginResponse(User user, boolean includeNewToken) {
        LoginResponse response = new LoginResponse();

        if (includeNewToken) {
            Map<String, Object> extraClaims = new HashMap<>();
            extraClaims.put("userId", user.getId());
            extraClaims.put("role", user.getRole().name());
            long pwdChangedMillis = user.getPasswordChangedAt() != null
                    ? user.getPasswordChangedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    : 0L;
            extraClaims.put("pwdChangedAt", pwdChangedMillis);

            String token = jwtService.generateToken(user.getEmail(), extraClaims);
            response.setToken(token);
        }

        response.setId(user.getId());
        response.setEmployeeId(user.getEmployeeId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setRole(user.getRole().name());
        response.setRoleLabel(user.getRoleLabel());
        response.setDesignation(user.getDesignation());
        response.setDepartment(user.getDepartment());
        response.setLevel(user.getLevel());
        response.setBranch(user.getBranch());
        response.setAvatar(user.getAvatar());
        response.setMustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()));

        return response;
    }

    public User getUserByEmail(String email) {
        return userRepository
                .findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    public User getUserByEmployeeId(String employeeId) {
        return userRepository
                .findByEmployeeId(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "employeeId", employeeId));
    }
}
