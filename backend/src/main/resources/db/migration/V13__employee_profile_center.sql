-- =============================================================================
-- Fairmacs KMS — Employee Profile Centre (V13)
-- Description:
--   1. Extends `users` table with position_band, employment_type, reporting_manager_id.
--   2. Creates `employee_personal_info` for employee self-service personal & address details.
--   3. Creates `employee_emergency_contacts` for primary and alternate emergency contacts.
--   4. Creates `employee_documents` for Zoho WorkDrive employee document metadata.
--   5. Creates `employment_status_requests` for multi-stage status workflow (Employee -> Manager -> HR/Admin).
--   6. Creates `employment_status_history` for auditable status transition history.
--   7. Creates `employee_preferences` for notification, theme, and language preferences.
--   8. Creates `employee_timeline_events` for chronological career & status milestones.
--   9. Strictly non-destructive.
-- =============================================================================

-- 1. Extend users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_band VARCHAR(50) DEFAULT 'P1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'FULL_TIME';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

UPDATE users
SET position_band = CASE
    WHEN level IS NOT NULL AND level ~* '^P[0-4]$' THEN UPPER(level)
    WHEN level IS NOT NULL AND level != '' THEN level
    ELSE 'P1'
END
WHERE position_band IS NULL OR position_band = '';

-- 2. Employee Personal Information
CREATE TABLE IF NOT EXISTS employee_personal_info (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    personal_email VARCHAR(255),
    personal_phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(50),
    blood_group VARCHAR(20),
    address_house VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_country VARCHAR(100) DEFAULT 'India',
    address_pincode VARCHAR(20),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_personal_info_user_id ON employee_personal_info(user_id);

-- 3. Employee Emergency Contacts
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    primary_phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_emergency_user_id ON employee_emergency_contacts(user_id);

-- 4. Employee Documents (Zoho WorkDrive metadata)
CREATE TABLE IF NOT EXISTS employee_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) NOT NULL,
    workdrive_file_id VARCHAR(255) NOT NULL,
    workdrive_folder_id VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    content_type VARCHAR(100),
    uploaded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_company_policy BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_user_id ON employee_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_emp_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_docs_category ON employee_documents(category);

-- 5. Employment Status Requests
CREATE TABLE IF NOT EXISTS employment_status_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) NOT NULL,
    requested_status VARCHAR(50) NOT NULL,
    current_status VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT NOT NULL,
    supporting_document_file_id VARCHAR(255),
    supporting_document_name VARCHAR(255),
    request_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_MANAGER',
    manager_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    manager_recommendation VARCHAR(50),
    manager_comment TEXT,
    manager_reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    hr_admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    hr_admin_comment TEXT,
    hr_reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_status_req_user_id ON employment_status_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_status_req_status ON employment_status_requests(request_status);

-- 6. Employment Status History
CREATE TABLE IF NOT EXISTS employment_status_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status_request_id BIGINT REFERENCES employment_status_requests(id) ON DELETE SET NULL,
    effective_date DATE NOT NULL,
    reason TEXT,
    comments TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_status_hist_user_id ON employment_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_status_hist_emp_id ON employment_status_history(employee_id);

-- 7. Employee Preferences
CREATE TABLE IF NOT EXISTS employee_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    assignment_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    course_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    theme VARCHAR(50) NOT NULL DEFAULT 'system',
    language VARCHAR(50) NOT NULL DEFAULT 'en',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_pref_user_id ON employee_preferences(user_id);

-- 8. Employee Timeline Events
CREATE TABLE IF NOT EXISTS employee_timeline_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_timeline_user_id ON employee_timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_timeline_date ON employee_timeline_events(event_date DESC);
