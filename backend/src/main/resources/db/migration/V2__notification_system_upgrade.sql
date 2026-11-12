-- =============================================================================
-- Fairmacs LMS — Notification System Upgrade Migration (V2)
-- Database: PostgreSQL (Supabase compatible)
-- Description: Additively extends the existing `notifications` table with
--              priority, action_url, deduplication_key, metadata_json, and
--              email delivery tracking columns, indexes, and scheduled job logs.
-- =============================================================================

-- 1. Ensure notifications table exists (safe no-op if already present)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    reference_type VARCHAR(100),
    reference_id VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- 2. Additively add new columns to existing notifications table
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(512),
    ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS metadata_json TEXT,
    ADD COLUMN IF NOT EXISTS email_status VARCHAR(32) DEFAULT 'DISABLED',
    ADD COLUMN IF NOT EXISTS email_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS email_last_attempt_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS email_error TEXT;

-- 3. Backfill any legacy NULL values safely
UPDATE notifications SET priority = 'NORMAL' WHERE priority IS NULL;
UPDATE notifications SET email_status = 'DISABLED' WHERE email_status IS NULL;
UPDATE notifications SET email_attempts = 0 WHERE email_attempts IS NULL;

-- 4. Create performance & idempotency indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
    ON notifications (recipient_user_id, is_read);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key
    ON notifications (deduplication_key)
    WHERE deduplication_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_email_status
    ON notifications (email_status, email_attempts)
    WHERE email_status IN ('PENDING', 'FAILED');

-- 5. Create scheduled notification job audit log table
CREATE TABLE IF NOT EXISTS notification_job_logs (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(128) NOT NULL,
    execution_key VARCHAR(255) NOT NULL UNIQUE,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(32) NOT NULL,
    processed_count INTEGER DEFAULT 0,
    notifications_created INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    summary_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_job_name_started
    ON notification_job_logs (job_name, started_at DESC);

