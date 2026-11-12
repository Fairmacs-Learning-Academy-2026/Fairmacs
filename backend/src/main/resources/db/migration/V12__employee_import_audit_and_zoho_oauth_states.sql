-- =============================================================================
-- Fairmacs LMS — Phase 5 & Phase 7: Employee Import Audit Logs & Zoho OAuth States (V12)
-- Description:
--   1. Creates employee_import_audit_logs for tracking Excel employee imports
--      (actor, timestamp, file name, total rows, success count, failure count).
--   2. Creates zoho_oauth_states for persistent OAuth CSRF state tokens so
--      Zoho WorkDrive authorization survives instance restarts.
--   3. Strictly non-destructive (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_import_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    imported_by_user_id BIGINT,
    imported_by_name VARCHAR(255),
    file_name VARCHAR(255),
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    error_summary TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_import_audit_created_at
    ON employee_import_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_import_audit_actor
    ON employee_import_audit_logs (imported_by_user_id);

CREATE TABLE IF NOT EXISTS zoho_oauth_states (
    state VARCHAR(128) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zoho_oauth_states_expires_at
    ON zoho_oauth_states (expires_at);
