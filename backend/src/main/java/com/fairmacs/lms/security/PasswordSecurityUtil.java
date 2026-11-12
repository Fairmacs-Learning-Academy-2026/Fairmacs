package com.fairmacs.lms.security;

import java.security.SecureRandom;
import java.util.Set;

/**
 * Centralized password policy validation and cryptographically secure temporary
 * password generation utility.
 */
public final class PasswordSecurityUtil {

    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SPECIAL = "!@#$%^&*_-+=";
    private static final String ALL_CHARS = UPPER + LOWER + DIGITS + SPECIAL;

    private static final int DEFAULT_TEMP_PASSWORD_LENGTH = 16;

    private static final Set<String> FORBIDDEN_KNOWN_PASSWORDS = Set.of(
            "employee@123",
            "trainer@123",
            "manager@123",
            "admin@123",
            "reset@123",
            "password@123",
            "fairmacs@123",
            "welcome@123"
    );

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private PasswordSecurityUtil() {
    }

    /**
     * Generates a cryptographically random temporary password that satisfies
     * the LMS password complexity policy.
     */
    public static String generateSecureTemporaryPassword() {
        char[] password = new char[DEFAULT_TEMP_PASSWORD_LENGTH];
        password[0] = UPPER.charAt(SECURE_RANDOM.nextInt(UPPER.length()));
        password[1] = LOWER.charAt(SECURE_RANDOM.nextInt(LOWER.length()));
        password[2] = DIGITS.charAt(SECURE_RANDOM.nextInt(DIGITS.length()));
        password[3] = SPECIAL.charAt(SECURE_RANDOM.nextInt(SPECIAL.length()));

        for (int i = 4; i < DEFAULT_TEMP_PASSWORD_LENGTH; i++) {
            password[i] = ALL_CHARS.charAt(SECURE_RANDOM.nextInt(ALL_CHARS.length()));
        }

        // Fisher-Yates shuffle with SecureRandom
        for (int i = password.length - 1; i > 0; i--) {
            int j = SECURE_RANDOM.nextInt(i + 1);
            char tmp = password[i];
            password[i] = password[j];
            password[j] = tmp;
        }

        return new String(password);
    }

    /**
     * Validates a candidate password against complexity rules and rejects known
     * insecure default passwords.
     */
    public static void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }
        if (password.length() > 128) {
            throw new IllegalArgumentException("Password must not exceed 128 characters.");
        }
        if (FORBIDDEN_KNOWN_PASSWORDS.contains(password.trim().toLowerCase())) {
            throw new IllegalArgumentException("This password is a known insecure default and cannot be used.");
        }

        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;

        for (int i = 0; i < password.length(); i++) {
            char ch = password.charAt(i);
            if (Character.isUpperCase(ch)) {
                hasUpper = true;
            } else if (Character.isLowerCase(ch)) {
                hasLower = true;
            } else if (Character.isDigit(ch)) {
                hasDigit = true;
            } else if (!Character.isWhitespace(ch)) {
                hasSpecial = true;
            }
        }

        if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            throw new IllegalArgumentException(
                    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
        }
    }
}

