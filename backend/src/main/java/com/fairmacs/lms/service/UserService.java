package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.LoginRequest;
import com.fairmacs.lms.dto.LoginResponse;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.JwtService;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {

        if (request == null ||
                request.getLoginId() == null ||
                request.getLoginId().trim().isEmpty()) {

            throw new IllegalArgumentException("Login ID is required");
        }

        if (request.getPassword() == null ||
                request.getPassword().isEmpty()) {

            throw new IllegalArgumentException("Password is required");
        }

        String loginId = request.getLoginId().trim();

        /*
         * Authenticate using Spring Security.
         *
         * CustomUserDetailsService performs a
         * case-insensitive lookup for employee ID/email.
         */
        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                loginId,
                                request.getPassword()
                        )
                );

        /*
         * Find the same authenticated user using the
         * case-insensitive repository query.
         */
        User user = userRepository
                .findByEmailOrEmployeeIdIgnoreCase(loginId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User",
                                "loginId",
                                loginId
                        )
                );

        /*
         * Only ACTIVE users are allowed to log in.
         */
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalStateException(
                    "Account is disabled. Please contact HR Admin."
            );
        }

        /*
         * Generate a real JWT for the authenticated user.
         */
        Map<String, Object> extraClaims = new HashMap<>();

        extraClaims.put("userId", user.getId());
        extraClaims.put("role", user.getRole().name());

        String token = jwtService.generateToken(
                user.getEmail(),
                extraClaims
        );

        /*
         * Build login response.
         */
        LoginResponse response = new LoginResponse();

        response.setToken(token);
        response.setId(user.getId());
        response.setEmployeeId(user.getEmployeeId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setRole(user.getRole().name());
        response.setRoleLabel(user.getRoleLabel());
        response.setDesignation(user.getDesignation());
        response.setDepartment(user.getDepartment());
        response.setAvatar(user.getAvatar());

        return response;
    }

    /*
     * CHANGE PASSWORD
     *
     * Verify the current password using BCrypt,
     * then store the new password as a BCrypt hash.
     */
    public void changePassword(
            Long userId,
            String currentPassword,
            String newPassword
    ) {

        if (currentPassword == null ||
                currentPassword.isBlank()) {

            throw new IllegalArgumentException(
                    "Current password is required."
            );
        }

        if (newPassword == null ||
                newPassword.isBlank()) {

            throw new IllegalArgumentException(
                    "New password is required."
            );
        }

        if (newPassword.length() < 8) {
            throw new IllegalArgumentException(
                    "New password must be at least 8 characters."
            );
        }

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User",
                                "id",
                                userId
                        )
                );

        /*
         * Compare the entered current password
         * against the BCrypt hash stored in MySQL.
         */
        if (!passwordEncoder.matches(
                currentPassword,
                user.getPassword()
        )) {
            throw new IllegalArgumentException(
                    "Current password does not match."
            );
        }

        /*
         * Prevent using the same password again.
         */
        if (passwordEncoder.matches(
                newPassword,
                user.getPassword()
        )) {
            throw new IllegalArgumentException(
                    "New password must be different from the current password."
            );
        }

        /*
         * Store only the BCrypt hash.
         */
        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        userRepository.save(user);
    }

    public User getUserByEmail(String email) {

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User",
                                "email",
                                email
                        )
                );
    }

    public User getUserByEmployeeId(String employeeId) {

        return userRepository
                .findByEmployeeId(employeeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User",
                                "employeeId",
                                employeeId
                        )
                );
    }

    public boolean verifyCurrentPassword(
        Long userId,
        String currentPassword
) {
    if (currentPassword == null || currentPassword.isBlank()) {
        throw new IllegalArgumentException(
                "Current password is required."
        );
    }

    User user = userRepository
            .findById(userId)
            .orElseThrow(
                    () -> new ResourceNotFoundException(
                            "User",
                            "id",
                            userId
                    )
            );

    return passwordEncoder.matches(
            currentPassword,
            user.getPassword()
    );
}
}