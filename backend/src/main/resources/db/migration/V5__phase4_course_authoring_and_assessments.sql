-- =============================================================================
-- Fairmacs LMS — Phase 4 Database Migration (V5)
-- Description: Supports course authoring enhancements, thumbnails, published dates,
--              department short codes, learning outcomes, lesson summaries,
--              and atomic concurrency-safe ID sequences.
-- =============================================================================

-- 1. Course Schema Extensions: publication date & learning outcomes
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS learning_outcomes TEXT;

-- For already active published courses without published_at, set published_at = created_at
UPDATE courses
SET published_at = created_at
WHERE active = TRUE AND COALESCE(is_draft, FALSE) = FALSE AND published_at IS NULL;

-- 2. Lesson Schema Extensions: user-entered lesson summary
ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS summary TEXT;

-- 3. Department Schema Extensions: department short code / prefix
ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS short_code VARCHAR(32);

UPDATE departments SET short_code = 'OP' WHERE name ILIKE '%Operations%' AND short_code IS NULL;
UPDATE departments SET short_code = 'DOC' WHERE name ILIKE '%Documentation%' AND short_code IS NULL;
UPDATE departments SET short_code = 'GEN' WHERE (name ILIKE '%General%' OR name ILIKE '%Common%') AND short_code IS NULL;
UPDATE departments SET short_code = 'HR' WHERE (name ILIKE '%Human Resource%' OR name ILIKE '%HR%') AND short_code IS NULL;
UPDATE departments SET short_code = 'ACC' WHERE (name ILIKE '%Account%' OR name ILIKE '%Finance%') AND short_code IS NULL;
UPDATE departments SET short_code = 'ADM' WHERE name ILIKE '%Admin%' AND short_code IS NULL;
UPDATE departments SET short_code = 'CS' WHERE name ILIKE '%Customer%' AND short_code IS NULL;
UPDATE departments SET short_code = 'PRC' WHERE name ILIKE '%Pricing%' AND short_code IS NULL;
UPDATE departments SET short_code = 'SAL' WHERE name ILIKE '%Sales%' AND short_code IS NULL;

-- 4. Atomic Concurrency-Safe ID Sequence Table (for Course IDs and Certificate IDs)
CREATE TABLE IF NOT EXISTS id_sequences (
    prefix VARCHAR(32) PRIMARY KEY,
    last_value BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Persistent Binary Thumbnail Storage Table
CREATE TABLE IF NOT EXISTS course_thumbnails (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
    storage_id VARCHAR(255) NOT NULL UNIQUE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_thumbnails_storage_id
    ON course_thumbnails (storage_id);

CREATE INDEX IF NOT EXISTS idx_course_thumbnails_course_id
    ON course_thumbnails (course_id);

