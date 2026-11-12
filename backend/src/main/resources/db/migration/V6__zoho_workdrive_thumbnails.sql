-- =============================================================================
-- Fairmacs LMS — Phase 4: Zoho WorkDrive Course Thumbnails (V6)
-- Description: Adds workdrive_file_id column and index to course_thumbnails,
--              and relaxes data column constraint for WorkDrive streaming.
-- =============================================================================

ALTER TABLE course_thumbnails
    ADD COLUMN IF NOT EXISTS workdrive_file_id VARCHAR(128);

ALTER TABLE course_thumbnails
    ALTER COLUMN data DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_thumbnails_workdrive_file_id
    ON course_thumbnails (workdrive_file_id);

