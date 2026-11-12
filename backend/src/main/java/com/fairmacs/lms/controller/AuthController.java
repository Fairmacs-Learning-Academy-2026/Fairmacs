package com.fairmacs.lms.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.LoginRequest;
import com.fairmacs.lms.dto.LoginResponse;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final SecurityContextUtil securityContextUtil;

    public AuthController(
            UserService userService,
            SecurityContextUtil securityContextUtil) {
        this.userService = userService;
        this.securityContextUtil = securityContextUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        try {
            String clientIp = httpRequest != null ? httpRequest.getRemoteAddr() : null;
            LoginResponse response = userService.login(request, clientIp);

            return ResponseEntity.ok(
                    ApiResponse.success("Login successful", response)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (AuthenticationException e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(UserService.GENERIC_LOGIN_ERROR));
        } catch (Exception e) {
            log.error("Unexpected error during login processing: {}", e.getClass().getSimpleName());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Unable to process login request at this time."));
        }
    }

    /**
     * Returns the authoritative profile and password-change requirement status
     * for the currently authenticated user.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LoginResponse>> getCurrentUser() {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication is required."));
        }

        LoginResponse profile = userService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(ApiResponse.success("Authenticated user profile", profile));
    }

    /**
     * Changes the password of the currently authenticated user.
     * The user ID is derived strictly from the validated security context.
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<LoginResponse>> changePassword(
            @RequestBody Map<String, String> request) {
        try {
            Long userId = securityContextUtil.getCurrentUserId();
            if (userId == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Authentication is required."));
            }

            String currentPassword = request != null ? request.get("currentPassword") : null;
            String newPassword = request != null ? request.get("newPassword") : null;

            LoginResponse updatedAuth = userService.changePassword(
                    userId,
                    currentPassword,
                    newPassword
            );

            return ResponseEntity.ok(
                    ApiResponse.success("Password updated successfully!", updatedAuth)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        } catch (AuthenticationException e) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Authentication is required."));
        } catch (Exception e) {
            log.error("Unexpected error during password change: {}", e.getClass().getSimpleName());
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Unable to change password."));
        }
    }
}
