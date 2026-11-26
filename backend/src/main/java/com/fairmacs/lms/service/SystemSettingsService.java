package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.SystemSetting;
import com.fairmacs.lms.repository.SystemSettingRepository;
import com.fairmacs.lms.security.PasswordSecurityUtil;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * HR/Admin managed system settings.
 *
 * Every setting is declared once in {@link #DEFINITIONS} (label, type, default, limits), so the
 * settings screen, validation and the code that consumes a setting all agree. A setting that has
 * never been saved simply returns its default value.
 */
@Service
public class SystemSettingsService {

    // ---- Branding -----------------------------------------------------
    public static final String ORGANIZATION_NAME = "organization.name";

    // ---- Learning -----------------------------------------------------
    public static final String QUIZ_COOLDOWN_MINUTES = "quiz.cooldown_minutes";
    public static final String QUIZ_MAX_ATTEMPTS = "quiz.max_attempts";
    public static final String QUIZ_PASSING_SCORE = "quiz.passing_score";

    // ---- Onboarding ---------------------------------------------------
    /** Write-only input key. The plain password is never stored. */
    public static final String INITIAL_PASSWORD = "onboarding.initial_password";
    /** What is actually stored: a BCrypt hash of the shared initial password. */
    static final String INITIAL_PASSWORD_HASH = "onboarding.initial_password_hash";

    private static final String TYPE_TEXT = "text";
    private static final String TYPE_NUMBER = "number";
    private static final String TYPE_PASSWORD = "password";

    private static final class Definition {
        final String key;
        final String category;
        final String label;
        final String description;
        final String type;
        final String defaultValue;
        final Integer min;
        final Integer max;

        Definition(String key, String category, String label, String description,
                   String type, String defaultValue, Integer min, Integer max) {
            this.key = key;
            this.category = category;
            this.label = label;
            this.description = description;
            this.type = type;
            this.defaultValue = defaultValue;
            this.min = min;
            this.max = max;
        }
    }

    private static final List<Definition> DEFINITIONS = List.of(
            new Definition(ORGANIZATION_NAME, "certificate", "Organisation name",
                    "Printed on every course completion certificate (\"organised and conducted by ...\").",
                    TYPE_TEXT, "FAIRMACS", 2, 80),
            new Definition(QUIZ_COOLDOWN_MINUTES, "learning", "Quiz retake cooldown (minutes)",
                    "How long a learner must wait after failing a quiz before trying again. "
                            + "A cooldown set on an individual quiz overrides this value.",
                    TYPE_NUMBER, "5", 1, 1440),
            new Definition(QUIZ_MAX_ATTEMPTS, "learning", "Maximum quiz attempts",
                    "How many times a learner may attempt each quiz. Use 0 for unlimited attempts.",
                    TYPE_NUMBER, "0", 0, 100),
            new Definition(QUIZ_PASSING_SCORE, "learning", "Default passing score (%)",
                    "Used for new courses and quizzes when the author does not set a passing score.",
                    TYPE_NUMBER, "70", 1, 100),
            new Definition(INITIAL_PASSWORD, "onboarding", "Shared initial password",
                    "Given to every new employee (bulk upload and the single employee form). "
                            + "Employees must change it at first login. Once stored, cannot be viewed again.",
                    TYPE_PASSWORD, "", null, null)
    );

    private static final List<String[]> CATEGORIES = List.of(
            new String[]{"certificate", "Certificate"},
            new String[]{"learning", "Learning"},
            new String[]{"onboarding", "Employee onboarding"}
    );

    private final SystemSettingRepository repository;
    private final PasswordEncoder passwordEncoder;

    public SystemSettingsService(SystemSettingRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    // ------------------------------------------------------------------
    // Typed readers used by the rest of the application
    // ------------------------------------------------------------------

    public String getString(String key) {
        Definition definition = definitionOf(key);
        Optional<SystemSetting> stored = repository.findById(key);
        if (stored.isPresent() && stored.get().getValue() != null && !stored.get().getValue().isBlank()) {
            return stored.get().getValue();
        }
        return definition != null ? definition.defaultValue : "";
    }

    public int getInt(String key) {
        Definition definition = definitionOf(key);
        int fallback = 0;
        if (definition != null) {
            try {
                fallback = Integer.parseInt(definition.defaultValue);
            } catch (NumberFormatException ignored) {
                fallback = 0;
            }
        }
        try {
            return Integer.parseInt(getString(key).trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    /** BCrypt hash of the shared initial password, or empty when HR has not configured one. */
    public Optional<String> getInitialPasswordHash() {
        return repository.findById(INITIAL_PASSWORD_HASH)
                .map(SystemSetting::getValue)
                .filter(value -> value != null && !value.isBlank());
    }

    public boolean isInitialPasswordConfigured() {
        return getInitialPasswordHash().isPresent();
    }

    // ------------------------------------------------------------------
    // Settings screen: read
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Map<String, Object> getAllSettings() {
        List<Map<String, Object>> groups = new ArrayList<>();

        for (String[] category : CATEGORIES) {
            List<Map<String, Object>> items = new ArrayList<>();
            for (Definition definition : DEFINITIONS) {
                if (!definition.category.equals(category[0])) {
                    continue;
                }
                items.add(describe(definition));
            }
            Map<String, Object> group = new LinkedHashMap<>();
            group.put("id", category[0]);
            group.put("label", category[1]);
            group.put("settings", items);
            groups.add(group);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("categories", groups);
        return response;
    }

    private Map<String, Object> describe(Definition definition) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("key", definition.key);
        item.put("label", definition.label);
        item.put("description", definition.description);
        item.put("type", definition.type);
        item.put("defaultValue", definition.defaultValue);
        item.put("min", definition.min);
        item.put("max", definition.max);

        String storageKey = TYPE_PASSWORD.equals(definition.type) ? INITIAL_PASSWORD_HASH : definition.key;
        Optional<SystemSetting> stored = repository.findById(storageKey);

        if (TYPE_PASSWORD.equals(definition.type)) {
            // The password itself is never returned, only whether one is set.
            boolean configured = stored.isPresent()
                    && stored.get().getValue() != null
                    && !stored.get().getValue().isBlank();
            item.put("value", "");
            item.put("configured", configured);
        } else {
            item.put("value", getString(definition.key));
        }
        item.put("updatedBy", stored.map(SystemSetting::getUpdatedBy).orElse(null));
        item.put("updatedAt", stored.map(s -> s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null).orElse(null));
        return item;
    }

    // ------------------------------------------------------------------
    // Settings screen: write
    // ------------------------------------------------------------------

    /**
     * Applies the supplied changes. Everything is validated first; nothing is saved if any
     * single value is invalid. A missing key means "no change"; for the password setting a
     * blank value also means "no change" and null means "remove".
     */
    @Transactional
    public Map<String, Object> updateSettings(Map<String, String> changes) {
        if (changes == null || changes.isEmpty()) {
            throw new IllegalArgumentException("No settings were supplied.");
        }

        Map<String, String> toStore = new LinkedHashMap<>();
        List<String> toRemove = new ArrayList<>();

        for (Map.Entry<String, String> entry : changes.entrySet()) {
            Definition definition = definitionOf(entry.getKey());
            if (definition == null) {
                throw new IllegalArgumentException("Unknown setting: " + entry.getKey());
            }
            String raw = entry.getValue();

            if (TYPE_PASSWORD.equals(definition.type)) {
                if (raw == null) {
                    toRemove.add(INITIAL_PASSWORD_HASH);
                } else if (!raw.isBlank()) {
                    PasswordSecurityUtil.validatePasswordStrength(raw);
                    toStore.put(INITIAL_PASSWORD_HASH, passwordEncoder.encode(raw));
                }
                continue;
            }

            if (raw == null) {
                throw new IllegalArgumentException(definition.label + " cannot be empty.");
            }
            String value = raw.trim();

            if (TYPE_NUMBER.equals(definition.type)) {
                int number;
                try {
                    number = Integer.parseInt(value);
                } catch (NumberFormatException ex) {
                    throw new IllegalArgumentException(definition.label + " must be a whole number.");
                }
                if (number < definition.min || number > definition.max) {
                    throw new IllegalArgumentException(definition.label + " must be between "
                            + definition.min + " and " + definition.max + ".");
                }
                value = String.valueOf(number);
            } else {
                value = value.replaceAll("[\\p{Cntrl}]+", " ").trim();
                if (value.length() < definition.min || value.length() > definition.max) {
                    throw new IllegalArgumentException(definition.label + " must be between "
                            + definition.min + " and " + definition.max + " characters.");
                }
            }
            toStore.put(definition.key, value);
        }

        String actor = currentActor();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<String, String> entry : toStore.entrySet()) {
            SystemSetting setting = repository.findById(entry.getKey()).orElseGet(SystemSetting::new);
            setting.setKey(entry.getKey());
            setting.setValue(entry.getValue());
            setting.setUpdatedBy(actor);
            setting.setUpdatedAt(now);
            repository.save(setting);
        }
        for (String key : toRemove) {
            repository.findById(key).ifPresent(repository::delete);
        }

        return getAllSettings();
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Definition definitionOf(String key) {
        for (Definition definition : DEFINITIONS) {
            if (definition.key.equals(key)) {
                return definition;
            }
        }
        return null;
    }

    private String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getName() != null) {
            return authentication.getName();
        }
        return "system";
    }
}
