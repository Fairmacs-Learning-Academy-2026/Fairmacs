-- ============================================================================
-- V3: Phase 1 Security & Authentication Hardening
-- Target: Supabase PostgreSQL
-- Purpose:
--   1. Add persistent first-login / temporary password change requirement flag
--      (must_change_password) to users.
--   2. Add password_changed_at timestamp to invalidate tokens issued prior to
--      the most recent password change or administrative password reset.
--   3. Add failed_login_attempts and locked_until columns for persistent
--      account lockout defense-in-depth alongside in-memory rate limiting.
-- ============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITHOUT TIME ZONE;

-- Ensure any NULL values from legacy schema creation are safely defaulted
UPDATE users
SET must_change_password = FALSE
WHERE must_change_password IS NULL;

UPDATE users
SET failed_login_attempts = 0
WHERE failed_login_attempts IS NULL;

