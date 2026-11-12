-- =============================================================================
-- Fairmacs LMS — Rename Human Resource to People Operations (V11)
-- Description:
--   1. Renames "Human Resource" to "People Operations" in departments table
--   2. Updates users with department "Human Resource" to "People Operations"
--   3. Updates courses with legacy category "Human Resource" to "People Operations"
-- =============================================================================

UPDATE departments
SET name = 'People Operations',
    description = 'People Operations and employee administration.'
WHERE name = 'Human Resource' OR name = 'Human Resources';

UPDATE users
SET department = 'People Operations'
WHERE department = 'Human Resource' OR department = 'Human Resources';

UPDATE courses
SET category = 'People Operations'
WHERE category = 'Human Resource' OR category = 'Human Resources';
