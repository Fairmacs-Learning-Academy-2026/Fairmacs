-- =============================================================================
-- Fairmacs LMS — Phase 1: Centralized Course Management & Department Ownership (V8)
-- Description:
--   1. Adds `department_id` to `courses` table as the explicit owning department
--   2. Creates `course_department_assignments` table for normalized target department assignments
--   3. Safely backfills department assignments from existing `draft_payload` for published courses
--   4. Preserves historical courses with NULL department_id for HR/Admin manual review
--   5. Strictly enforces enrollment type check constraints and unique constraints
-- =============================================================================

-- 1. Add owning department to courses table
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_department_id
    ON courses (department_id);

-- 2. Create course_department_assignments table
CREATE TABLE IF NOT EXISTS course_department_assignments (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    assignment_type VARCHAR(32) NOT NULL DEFAULT 'MANDATORY',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cda_assignment_type CHECK (assignment_type IN ('MANDATORY', 'RECOMMENDED')),
    CONSTRAINT uq_course_department_assignment UNIQUE (course_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_cda_course_id
    ON course_department_assignments (course_id);

CREATE INDEX IF NOT EXISTS idx_cda_department_id
    ON course_department_assignments (department_id);

-- 3. Enrollments: Verify enrollment_type constraint supports MANDATORY, RECOMMENDED, SELF_SELECTED
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_enrollment_type_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_enrollment_type_check
    CHECK (enrollment_type IN ('MANDATORY', 'RECOMMENDED', 'SELF_SELECTED'));

-- Ensure unique constraint on enrollments (user_id, course_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_enrollments_user_course'
    ) THEN
        ALTER TABLE enrollments 
            ADD CONSTRAINT uq_enrollments_user_course UNIQUE (user_id, course_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END $$;

-- 4. Safe backfill: Extract targetDepartments from valid JSON draft_payload for published courses
DO $$
DECLARE
    r RECORD;
    d_name TEXT;
    d_id BIGINT;
    is_mand BOOLEAN;
    assign_type VARCHAR(32);
BEGIN
    FOR r IN 
        SELECT id, draft_payload 
        FROM courses 
        WHERE draft_payload IS NOT NULL 
          AND length(trim(draft_payload)) > 10 
          AND active = TRUE
    LOOP
        BEGIN
            -- Check if draft_payload is valid JSON and has targetDepartments
            IF (r.draft_payload::jsonb ? 'targetDepartments') THEN
                is_mand := COALESCE((r.draft_payload::jsonb ->> 'mandatory')::boolean, TRUE);
                assign_type := CASE WHEN is_mand THEN 'MANDATORY' ELSE 'RECOMMENDED' END;
                
                FOR d_name IN 
                    SELECT jsonb_array_elements_text(r.draft_payload::jsonb -> 'targetDepartments')
                LOOP
                    SELECT id INTO d_id FROM departments WHERE LOWER(name) = LOWER(trim(d_name)) LIMIT 1;
                    IF d_id IS NOT NULL THEN
                        INSERT INTO course_department_assignments (course_id, department_id, assignment_type)
                        VALUES (r.id, d_id, assign_type)
                        ON CONFLICT (course_id, department_id) DO NOTHING;
                    END IF;
                END LOOP;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Ignore unparseable draft_payload so migration does not fail
                NULL;
        END;
    END LOOP;
END $$;

