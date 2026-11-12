-- =========================================================================
-- Fairmacs KMS Database Migration: V15
-- Description: Enforce Database-Level Immutability for Policy Acknowledgements & Audit Logs
-- System: Spring Boot 3.3.x / Supabase PostgreSQL
-- =========================================================================

-- 1. Trigger function to block UPDATE and DELETE on append-only compliance tables
CREATE OR REPLACE FUNCTION prevent_policy_acknowledgement_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is strictly append-only. Updates and deletes are prohibited by compliance policy.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach immutability trigger to policy_acknowledgements
DROP TRIGGER IF EXISTS trg_protect_policy_acknowledgements ON policy_acknowledgements;

CREATE TRIGGER trg_protect_policy_acknowledgements
BEFORE UPDATE OR DELETE ON policy_acknowledgements
FOR EACH ROW
EXECUTE FUNCTION prevent_policy_acknowledgement_modification();

-- 3. Attach immutability trigger to policy_audit_logs
DROP TRIGGER IF EXISTS trg_protect_policy_audit_logs ON policy_audit_logs;

CREATE TRIGGER trg_protect_policy_audit_logs
BEFORE UPDATE OR DELETE ON policy_audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_policy_acknowledgement_modification();
