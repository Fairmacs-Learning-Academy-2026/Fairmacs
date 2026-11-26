-- Key/value store for HR/Admin managed system settings (branding, learning rules, onboarding).
-- Secrets are never stored in plain text: the shared initial password is kept as a BCrypt hash.
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key   VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_by    VARCHAR(255),
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
