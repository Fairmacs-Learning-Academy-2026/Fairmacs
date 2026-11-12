-- =============================================================================
-- Fairmacs LMS — Update Quiz Cooldown to 5 Minutes (V9)
-- Description:
--   1. Updates column default for cooldown_minutes to 5 on quizzes table
--   2. Updates existing quiz rows from 30 minutes to 5 minutes
-- =============================================================================

ALTER TABLE quizzes
    ALTER COLUMN cooldown_minutes SET DEFAULT 5;

UPDATE quizzes
SET cooldown_minutes = 5
WHERE cooldown_minutes = 30 OR cooldown_minutes IS NULL;
