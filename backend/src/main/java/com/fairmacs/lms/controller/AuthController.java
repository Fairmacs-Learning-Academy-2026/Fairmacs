package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.LoginRequest;
import com.fairmacs.lms.dto.LoginResponse;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.UserService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

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
            @Valid @RequestBody LoginRequest request) {

        try {

            LoginResponse response =
                    userService.login(request);

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Login successful",
                            response
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(401)
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );
        }
    }

    /*
     * VERIFY CURRENT PASSWORD
     *
     * Verifies the authenticated user's current password
     * without changing the password.
     *
     * The user ID is taken from the JWT/Spring Security
     * context, so the frontend cannot verify another
     * user's password.
     */
    @PostMapping("/verify-current-password")
    public ResponseEntity<ApiResponse<Boolean>> verifyCurrentPassword(
            @RequestBody Map<String, String> request) {

        try {

            String currentPassword =
                    request.get("currentPassword");

            Long userId =
                    securityContextUtil.getCurrentUserId();

            boolean valid =
                    userService.verifyCurrentPassword(
                            userId,
                            currentPassword
                    );

            if (!valid) {

                return ResponseEntity.ok(
                        ApiResponse.success(
                                "Current password does not match.",
                                false
                        )
                );
            }

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Current password verified.",
                            true
                    )
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(500)
                    .body(
                            ApiResponse.error(
                                    "Unable to verify current password."
                            )
                    );
        }
    }

    /*
     * CHANGE PASSWORD
     *
     * The authenticated user's ID is taken from
     * the JWT/Spring Security context.
     *
     * The frontend cannot choose another user's ID.
     */
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody Map<String, String> request) {

        try {

            String currentPassword =
                    request.get("currentPassword");

            String newPassword =
                    request.get("newPassword");

            Long userId =
                    securityContextUtil.getCurrentUserId();

            userService.changePassword(
                    userId,
                    currentPassword,
                    newPassword
            );

            return ResponseEntity.ok(
                    ApiResponse.success(
                            "Password updated successfully!",
                            null
                    )
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            ApiResponse.error(
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            return ResponseEntity
                    .status(500)
                    .body(
                            ApiResponse.error(
                                    "Unable to change password."
                            )
                    );
        }
    }
}