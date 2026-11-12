-- =============================================================================
-- Fairmacs LMS — Remove Quiz Max Attempts Caps (V10)
-- Description:
--   1. Drops default value on max_attempts in quizzes table
--   2. Sets max_attempts to NULL so retakes are governed solely by the 5-minute cooldown
-- =============================================================================

ALTER TABLE quizzes
    ALTER COLUMN max_attempts DROP DEFAULT;

UPDATE quizzes
SET max_attempts = NULL;
