-- =============================================================================
-- Fairmacs KMS — Policies & Agreements Management System (V14)
-- Description:
--   1. Creates `policy_categories` for configurable organizational policy categories.
--   2. Seeds initial baseline policy categories.
--   3. Creates `policy_documents` for logical policy/agreement governance.
--   4. Creates `policy_versions` for immutable physical file versions (Zoho WorkDrive references & SHA-256).
--   5. Creates `policy_assignments` for employee-level assignment records with deterministic precedence.
--   6. Creates `policy_acknowledgements` for append-only, immutable user acceptance history.
--   7. Creates `policy_audit_logs` for administrative governance tracking.
--   8. Strictly forward-only, non-destructive migration.
-- =============================================================================

-- 1. Policy Categories
CREATE TABLE IF NOT EXISTS policy_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_categories_active ON policy_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_policy_categories_code ON policy_categories(code);

-- Seed initial baseline categories
INSERT INTO policy_categories (category_name, code, description, is_active, display_order)
VALUES
    ('Company Policies', 'COMPANY_POLICIES', 'General organization-wide rules, code of conduct, and corporate governance', TRUE, 1),
    ('Employment Agreements', 'EMPLOYMENT_AGREEMENTS', 'Employment contracts, confidentiality pacts, and service agreements', TRUE, 2),
    ('IT & Security Policies', 'IT_SECURITY_POLICIES', 'Information security, acceptable use, data protection, and access management', TRUE, 3),
    ('Workplace Policies', 'WORKPLACE_POLICIES', 'Health, safety, workplace ethics, and anti-harassment guidelines', TRUE, 4),
    ('Operational Policies', 'OPERATIONAL_POLICIES', 'Standard Operating Procedures (SOPs), supply chain, logistics, and quality assurance', TRUE, 5),
    ('Other Agreements', 'OTHER_AGREEMENTS', 'Miscellaneous agreements, compliance forms, and regulatory acknowledgements', TRUE, 6)
ON CONFLICT (code) DO NOTHING;

-- 2. Policy Documents (Logical Container)
CREATE TABLE IF NOT EXISTS policy_documents (
    id BIGSERIAL PRIMARY KEY,
    document_code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id BIGINT NOT NULL REFERENCES policy_categories(id) ON DELETE RESTRICT,
    owning_department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    document_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approval_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
    approval_comment TEXT,
    submitted_at TIMESTAMP WITHOUT TIME ZONE,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    published_at TIMESTAMP WITHOUT TIME ZONE,
    archived_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_docs_code ON policy_documents(document_code);
CREATE INDEX IF NOT EXISTS idx_policy_docs_status ON policy_documents(document_status);
CREATE INDEX IF NOT EXISTS idx_policy_docs_category ON policy_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_policy_docs_dept ON policy_documents(owning_department_id);
CREATE INDEX IF NOT EXISTS idx_policy_docs_created_by ON policy_documents(created_by);

-- 3. Policy Versions (Physical Document & WorkDrive References)
CREATE TABLE IF NOT EXISTS policy_versions (
    id BIGSERIAL PRIMARY KEY,
    policy_document_id BIGINT NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    version_type VARCHAR(50) NOT NULL DEFAULT 'MAJOR',
    workdrive_file_id VARCHAR(255) NOT NULL,
    workdrive_file_name VARCHAR(255) NOT NULL,
    workdrive_folder_id VARCHAR(255),
    file_mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL DEFAULT 0,
    sha256_hash VARCHAR(64) NOT NULL,
    effective_date DATE NOT NULL,
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    version_notes TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_versions_doc_ver UNIQUE (policy_document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_doc ON policy_versions(policy_document_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_file_id ON policy_versions(workdrive_file_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_created_at ON policy_versions(created_at DESC);

-- 4. Policy Assignments (Employee-Level Assignments)
CREATE TABLE IF NOT EXISTS policy_assignments (
    id BIGSERIAL PRIMARY KEY,
    policy_document_id BIGINT NOT NULL REFERENCES policy_documents(id) ON DELETE CASCADE,
    policy_version_id BIGINT NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
    employee_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    employee_id_snapshot VARCHAR(255) NOT NULL,
    department_id_snapshot BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    department_name_snapshot VARCHAR(255),
    assignment_source VARCHAR(50) NOT NULL,
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    due_date DATE,
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_assignments_ver_user UNIQUE (policy_version_id, employee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_assign_user ON policy_assignments(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_policy_assign_doc ON policy_assignments(policy_document_id);
CREATE INDEX IF NOT EXISTS idx_policy_assign_version ON policy_assignments(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_policy_assign_status ON policy_assignments(assignment_status);
CREATE INDEX IF NOT EXISTS idx_policy_assign_due_date ON policy_assignments(due_date);

-- 5. Policy Acknowledgements (Append-Only Immutable Records)
CREATE TABLE IF NOT EXISTS policy_acknowledgements (
    id BIGSERIAL PRIMARY KEY,
    policy_assignment_id BIGINT NOT NULL REFERENCES policy_assignments(id) ON DELETE RESTRICT,
    policy_document_id BIGINT NOT NULL REFERENCES policy_documents(id) ON DELETE RESTRICT,
    policy_version_id BIGINT NOT NULL REFERENCES policy_versions(id) ON DELETE RESTRICT,
    employee_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    employee_id_snapshot VARCHAR(255) NOT NULL,
    accepted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    authenticated_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    document_sha256_hash VARCHAR(64) NOT NULL,
    acknowledgement_text_version TEXT NOT NULL,
    request_ip VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_policy_ack_ver_user UNIQUE (policy_version_id, employee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_ack_user_version ON policy_acknowledgements(employee_user_id, policy_version_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_doc ON policy_acknowledgements(policy_document_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_assignment ON policy_acknowledgements(policy_assignment_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_accepted_at ON policy_acknowledgements(accepted_at DESC);

-- 6. Policy Audit Logs (Administrative Governance Tracking)
CREATE TABLE IF NOT EXISTS policy_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    policy_document_id BIGINT REFERENCES policy_documents(id) ON DELETE SET NULL,
    policy_version_id BIGINT REFERENCES policy_versions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_employee_id VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_audit_doc ON policy_audit_logs(policy_document_id);
CREATE INDEX IF NOT EXISTS idx_policy_audit_action ON policy_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_policy_audit_created ON policy_audit_logs(created_at DESC);
