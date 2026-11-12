-- =============================================================================
-- Fairmacs LMS — Initial Baseline Schema Migration (V1)
-- Database: PostgreSQL (Supabase compatible)
-- Description: Establishes the core Fairmacs LMS relational schema for fresh
--              environments. Uses idempotent CREATE TABLE IF NOT EXISTS so
--              existing environments baselined at V1 remain untouched.
-- =============================================================================

-- 1. Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    foundation_track BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255),
    head_id VARCHAR(255),
    employee_count INTEGER DEFAULT 0,
    active_courses_count INTEGER DEFAULT 0,
    completion_rate DOUBLE PRECISION DEFAULT 0.0,
    parent_department_id BIGINT REFERENCES departments(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users (Core baseline columns; Phase 1 lockout/password columns added in V3)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    role_label VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    designation VARCHAR(255),
    level VARCHAR(255),
    branch VARCHAR(255),
    joining_date VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    avatar VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (role IN ('EMPLOYEE', 'TRAINER', 'MANAGER', 'HR_ADMIN')),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'))
);

-- 4. Courses
CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY,
    course_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    category_id BIGINT REFERENCES categories(id),
    duration VARCHAR(255),
    duration_hours DOUBLE PRECISION,
    level VARCHAR(255),
    rating DOUBLE PRECISION DEFAULT 0.0,
    enrolled_count INTEGER DEFAULT 0,
    description TEXT,
    banner VARCHAR(255),
    foundation BOOLEAN DEFAULT FALSE,
    passing_score INTEGER DEFAULT 80,
    active BOOLEAN DEFAULT TRUE,
    is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    draft_payload TEXT,
    certificate_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    quiz_json TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_draft_owner
    ON courses (created_by, is_draft);

-- 5. Modules
CREATE TABLE IF NOT EXISTS modules (
    id BIGSERIAL PRIMARY KEY,
    module_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id BIGSERIAL PRIMARY KEY,
    lesson_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(255),
    content_url VARCHAR(255),
    workdrive_file_id VARCHAR(255),
    duration VARCHAR(255),
    order_index INTEGER,
    module_id BIGINT NOT NULL REFERENCES modules(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    course_id BIGINT NOT NULL REFERENCES courses(id),
    enrollment_type VARCHAR(255) NOT NULL DEFAULT 'SELF_SELECTED',
    progress_percent INTEGER DEFAULT 0,
    status VARCHAR(255) NOT NULL DEFAULT 'NOT_STARTED',
    score INTEGER,
    due_date DATE,
    completed_date TIMESTAMP WITHOUT TIME ZONE,
    certificate_id VARCHAR(255),
    last_accessed TIMESTAMP WITHOUT TIME ZONE,
    enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_enrollments_user_course UNIQUE (user_id, course_id),
    CONSTRAINT enrollments_enrollment_type_check CHECK (enrollment_type IN ('MANDATORY', 'SELF_SELECTED')),
    CONSTRAINT enrollments_status_check CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'REVOKED'))
);

-- 8. Lesson Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id),
    lesson_id BIGINT NOT NULL REFERENCES lessons(id),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completion_percent INTEGER NOT NULL DEFAULT 0,
    watched_seconds INTEGER DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    last_accessed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_lesson_progress_enrollment_lesson UNIQUE (enrollment_id, lesson_id)
);

-- 9. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id BIGSERIAL PRIMARY KEY,
    quiz_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    module_id BIGINT REFERENCES modules(id),
    passing_score INTEGER DEFAULT 80,
    time_limit_minutes INTEGER DEFAULT 30,
    max_attempts INTEGER DEFAULT 3,
    questions_per_attempt INTEGER DEFAULT 10,
    randomize_questions BOOLEAN DEFAULT TRUE,
    randomize_options BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT quizzes_type_check CHECK (type IN ('MODULE', 'FINAL'))
);

-- 10. Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id BIGSERIAL PRIMARY KEY,
    question_id VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(255) NOT NULL DEFAULT 'SINGLE_CHOICE',
    optiona TEXT,
    optionb TEXT,
    optionc TEXT,
    optiond TEXT,
    correct_answer VARCHAR(255) NOT NULL,
    explanation TEXT,
    order_index INTEGER,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    attempt_id VARCHAR(255) NOT NULL UNIQUE,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    attempt_number INTEGER NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    question_ids TEXT,
    answers_json TEXT,
    option_order_json TEXT,
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITHOUT TIME ZONE
);

-- 12. Quiz Progress
CREATE TABLE IF NOT EXISTS quiz_progress (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quizzes(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    best_score INTEGER DEFAULT 0,
    attempts_used INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    passing_attempt_number INTEGER,
    passed_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_quiz_progress_quiz_user UNIQUE (quiz_id, user_id)
);

-- 13. Certificates
CREATE TABLE IF NOT EXISTS certificates (
    id BIGSERIAL PRIMARY KEY,
    certificate_id VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    course_id BIGINT NOT NULL REFERENCES courses(id),
    score INTEGER,
    pdf_url VARCHAR(255),
    issued_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Learning Paths
CREATE TABLE IF NOT EXISTS learning_paths (
    id BIGSERIAL PRIMARY KEY,
    path_code VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    suggested BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Learning Path Items
CREATE TABLE IF NOT EXISTS learning_path_items (
    id BIGSERIAL PRIMARY KEY,
    path_id BIGINT NOT NULL REFERENCES learning_paths(id),
    course_id BIGINT NOT NULL REFERENCES courses(id),
    order_index INTEGER DEFAULT 0
);

-- 16. Recommendation Rules
CREATE TABLE IF NOT EXISTS recommendation_rules (
    id BIGSERIAL PRIMARY KEY,
    department VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    course_id BIGINT NOT NULL REFERENCES courses(id),
    priority INTEGER DEFAULT 0
);

-- 17. Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    session_date DATE NOT NULL,
    time VARCHAR(80),
    event_type VARCHAR(40),
    trainer VARCHAR(180),
    location VARCHAR(500),
    target_type VARCHAR(24) NOT NULL DEFAULT 'ALL',
    department VARCHAR(120),
    created_by_user_id BIGINT,
    created_by_name VARCHAR(180),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT training_sessions_target_type_check CHECK (target_type IN ('ALL', 'DEPARTMENT', 'EMPLOYEES'))
);

-- 18. Training Session Targets (ElementCollection table)
CREATE TABLE IF NOT EXISTS training_session_targets (
    session_id BIGINT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (session_id, user_id)
);

-- 19. Notifications (Core baseline columns; extended in V2)
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    reference_type VARCHAR(100),
    reference_id VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITHOUT TIME ZONE
);

-- 20. Zoho WorkDrive Integration Credentials (Used by ZohoOAuthService via JdbcTemplate)
CREATE TABLE IF NOT EXISTS zoho_integration_credentials (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    refresh_token_encrypted TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
