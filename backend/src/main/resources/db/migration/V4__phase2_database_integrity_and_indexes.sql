-- =============================================================================
-- Fairmacs LMS — Phase 2: Database Integrity, Schema Alignment & Indexes (V4)
-- Database: PostgreSQL (Supabase compatible)
-- Description:
--   1. Aligns column types and SQL defaults on `users`, `notifications`, and
--      `notification_job_logs` where Hibernate `ddl-auto=update` previously
--      created columns without SQL defaults or with mismatched column types.
--   2. Backfills legacy NULL values on `notifications` (`email_status`,
--      `email_attempts`, `priority`, `is_read`) and `notification_job_logs`.
--   3. Ensures `zoho_integration_credentials` exists for Zoho OAuth token storage.
--   4. Adds missing B-tree, functional, and partial indexes justified by
--      actual Spring Data JPA repository query patterns and foreign keys.
--   5. Strictly non-destructive: zero DROP, TRUNCATE, or data-loss operations.
-- =============================================================================

-- 1. Align `users` column types and SQL defaults with User.java entity
ALTER TABLE users
    ALTER COLUMN level TYPE VARCHAR(255),
    ALTER COLUMN status SET DEFAULT 'ACTIVE',
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN must_change_password SET DEFAULT FALSE,
    ALTER COLUMN failed_login_attempts SET DEFAULT 0;

UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL;
UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL;

-- 2. Repair `notifications` column types, SQL defaults, and legacy NULL rows
ALTER TABLE notifications
    ALTER COLUMN priority TYPE VARCHAR(32),
    ALTER COLUMN priority SET DEFAULT 'NORMAL',
    ALTER COLUMN action_url TYPE VARCHAR(512),
    ALTER COLUMN email_status TYPE VARCHAR(32),
    ALTER COLUMN email_status SET DEFAULT 'DISABLED',
    ALTER COLUMN email_attempts SET DEFAULT 0,
    ALTER COLUMN is_read SET DEFAULT FALSE,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

UPDATE notifications SET priority = 'NORMAL' WHERE priority IS NULL;
UPDATE notifications SET email_status = 'DISABLED' WHERE email_status IS NULL;
UPDATE notifications SET email_attempts = 0 WHERE email_attempts IS NULL;
UPDATE notifications SET is_read = FALSE WHERE is_read IS NULL;

-- 3. Repair `notification_job_logs` column types, SQL defaults, and NULL counts
ALTER TABLE notification_job_logs
    ALTER COLUMN job_name TYPE VARCHAR(128),
    ALTER COLUMN status TYPE VARCHAR(32),
    ALTER COLUMN started_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN processed_count SET DEFAULT 0,
    ALTER COLUMN notifications_created SET DEFAULT 0,
    ALTER COLUMN failure_count SET DEFAULT 0;

UPDATE notification_job_logs SET processed_count = 0 WHERE processed_count IS NULL;
UPDATE notification_job_logs SET notifications_created = 0 WHERE notifications_created IS NULL;
UPDATE notification_job_logs SET failure_count = 0 WHERE failure_count IS NULL;

-- 4. Ensure Zoho WorkDrive OAuth credentials table exists
CREATE TABLE IF NOT EXISTS zoho_integration_credentials (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    refresh_token_encrypted TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. Query-Justified Foreign Key, Lookup, and Partial Indexes
-- =============================================================================

-- Users: case-insensitive login/import lookups and department/role filtering
CREATE INDEX IF NOT EXISTS idx_users_lower_email
    ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_users_lower_employee_id
    ON users (LOWER(employee_id));

CREATE INDEX IF NOT EXISTS idx_users_dept_role_status
    ON users (LOWER(department), role, status);

-- Departments: parent department hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_departments_parent_id
    ON departments (parent_department_id);

-- Courses: catalog filtering, category foreign key, and draft ownership
CREATE INDEX IF NOT EXISTS idx_courses_category_id
    ON courses (category_id);

CREATE INDEX IF NOT EXISTS idx_courses_active_draft
    ON courses (active, is_draft);

CREATE INDEX IF NOT EXISTS idx_courses_draft_owner
    ON courses (created_by, is_draft);

-- Modules: course curriculum ordering and business key lookup
CREATE INDEX IF NOT EXISTS idx_modules_course_order
    ON modules (course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_modules_module_id
    ON modules (module_id);

-- Lessons: module lesson ordering and business key lookup
CREATE INDEX IF NOT EXISTS idx_lessons_module_order
    ON lessons (module_id, order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_lesson_id
    ON lessons (lesson_id);

-- Enrollments: course lookups and scheduled deadline/overdue reminder scans
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id
    ON enrollments (course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_status_due_date
    ON enrollments (status, due_date);

-- Lesson Progress: foreign key lookup on lesson_id
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id
    ON lesson_progress (lesson_id);

-- Quizzes: course + type lookup and module foreign key lookup
CREATE INDEX IF NOT EXISTS idx_quizzes_course_type
    ON quizzes (course_id, type);

CREATE INDEX IF NOT EXISTS idx_quizzes_module_id
    ON quizzes (module_id);

-- Quiz Questions: ordered question loading per quiz and business key lookup
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_order
    ON quiz_questions (quiz_id, order_index);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_id
    ON quiz_questions (question_id);

-- Quiz Attempts: user attempt history, quiz attempt ordering, and retake scheduler
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user_num
    ON quiz_attempts (quiz_id, user_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_started
    ON quiz_attempts (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_retake
    ON quiz_attempts (passed, completed_at);

-- Quiz Progress: user progress lookup across quizzes
CREATE INDEX IF NOT EXISTS idx_quiz_progress_user_id
    ON quiz_progress (user_id);

-- Certificates: user certificate listing and course certificate lookup
CREATE INDEX IF NOT EXISTS idx_certificates_user_issued
    ON certificates (user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificates_course_id
    ON certificates (course_id);

-- Learning Path Items: path ordering and course foreign key
CREATE INDEX IF NOT EXISTS idx_learning_path_items_path_order
    ON learning_path_items (path_id, order_index);

CREATE INDEX IF NOT EXISTS idx_learning_path_items_course_id
    ON learning_path_items (course_id);

-- Recommendation Rules: department matching and course foreign key
CREATE INDEX IF NOT EXISTS idx_recommendation_rules_course_id
    ON recommendation_rules (course_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_rules_lower_dept
    ON recommendation_rules (LOWER(department));

-- Training Sessions & Targets: calendar date range queries and target user lookup
CREATE INDEX IF NOT EXISTS idx_training_sessions_date_id
    ON training_sessions (session_date, id);

CREATE INDEX IF NOT EXISTS idx_training_session_targets_user_id
    ON training_session_targets (user_id);

-- Notifications: ensure partial index for pending/failed email retry scans exists
CREATE INDEX IF NOT EXISTS idx_notifications_email_status
    ON notifications (email_status, email_attempts)
    WHERE email_status IN ('PENDING', 'FAILED');
