-- =============================================================================
-- Fairmacs LMS — Phase 4A: Course History, Assessments, Cooldown & Departments (V7)
-- Description:
--   1. Renames departments: 'IT & Technology' -> 'Information Technology',
--      'General / Common' / 'General/common' -> 'General'
--   2. Updates users and courses department references consistently
--   3. Updates enrollments.enrollment_type check constraint to support 'RECOMMENDED'
--   4. Adds optional cooldown_minutes column to quizzes (default 30 mins)
--   5. Adds helpful composite indexes for course history and transcript lookups
-- =============================================================================

-- 1. Enrollments: Allow 'RECOMMENDED' in enrollment_type check constraint
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_enrollment_type_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_enrollment_type_check
    CHECK (enrollment_type IN ('MANDATORY', 'RECOMMENDED', 'SELF_SELECTED'));

-- 2. Quizzes: Add cooldown_minutes column with default 30 minutes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER DEFAULT 30;

-- 3. Department Renames: Update existing department rows
UPDATE departments
SET name = 'Information Technology', short_code = 'IT'
WHERE name ILIKE '%IT & Technology%' OR name ILIKE '%IT & Systems%' OR name ILIKE '%IT & Security%';

UPDATE departments
SET name = 'General', short_code = 'GEN'
WHERE name ILIKE '%General%' OR name ILIKE '%Common%';

-- Ensure 'Information Technology' exists
INSERT INTO departments (name, description, short_code, employee_count, active_courses_count, completion_rate)
SELECT 'Information Technology', 'Information technology, infrastructure and software systems.', 'IT', 0, 0, 0.0
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Information Technology');

-- Ensure 'General' exists
INSERT INTO departments (name, description, short_code, employee_count, active_courses_count, completion_rate)
SELECT 'General', 'Common training and organizational compliance across departments.', 'GEN', 0, 0, 0.0
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'General');

-- 4. Propagate department renames to users table
UPDATE users
SET department = 'Information Technology'
WHERE department ILIKE '%IT & Technology%' OR department ILIKE '%IT & Systems%' OR department ILIKE '%IT & Security%';

UPDATE users
SET department = 'General'
WHERE department ILIKE '%General%' OR department ILIKE '%Common%';

-- 5. Propagate department renames to courses (category column) and categories tables
UPDATE courses
SET category = 'Information Technology'
WHERE category ILIKE '%IT & Technology%' OR category ILIKE '%IT & Systems%' OR category ILIKE '%IT & Security%';

UPDATE courses
SET category = 'General'
WHERE category ILIKE '%General%' OR category ILIKE '%Common%';

UPDATE categories
SET name = 'Information Technology'
WHERE name ILIKE '%IT & Technology%' OR name ILIKE '%IT & Systems%' OR name ILIKE '%IT & Security%';

UPDATE categories
SET name = 'General'
WHERE name ILIKE '%General%' OR name ILIKE '%Common%';

-- 6. Indexes for Course History & Transcript queries
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status ON enrollments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_user_comp ON quiz_attempts (quiz_id, user_id, completed_at);

