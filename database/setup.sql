-- =========================================
-- Virtual Laboratory Hub Database Schema
-- =========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create database (run separately if needed)
-- CREATE DATABASE virtuallab_db;

-- Users table for authentication and profiles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    institution VARCHAR(255),
    program_level VARCHAR(50) CHECK (program_level IN ('undergraduate', 'graduate', 'phd', 'researcher', 'instructor')),
    field_of_study VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    is_demo BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'
CHECK (role IN ('student', 'teacher', 'admin'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_type VARCHAR(50) NOT NULL CHECK (experiment_type IN ('hrv', 'emg', 'ecg', 'eeg')),
    experiment_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    parameters JSONB DEFAULT '{}',
    raw_signals JSONB DEFAULT '{}',
    processed_signals JSONB DEFAULT '{}',
    features_extracted JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    analysis_results JSONB DEFAULT '{}',
    symbolic_reasoning JSONB DEFAULT '{}',
    confidence_scores JSONB DEFAULT '{}',
    duration_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS experiment_catalog_id INTEGER REFERENCES experiment_catalog(id) ON DELETE SET NULL;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS pretest_score NUMERIC(6,2);
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS posttest_score NUMERIC(6,2);
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS starting_level VARCHAR(50);
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS ending_level VARCHAR(50);
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS adaptation_summary JSONB DEFAULT '{}';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- User interactions for ML analysis
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE CASCADE,
    interaction_type VARCHAR(100) NOT NULL,
    page_section VARCHAR(100),
    interaction_data JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    mouse_coordinates JSONB,
    viewport_size JSONB,
    accuracy DECIMAL(3,2),
    response_time_ms INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS module_id INTEGER;
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS section_id INTEGER;
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS browser_info TEXT;
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS scroll_depth NUMERIC(5,2);
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS click_target VARCHAR(255);
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS dwell_time_ms INTEGER;
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS keystroke_count INTEGER DEFAULT 0;
ALTER TABLE user_interactions ADD COLUMN IF NOT EXISTS is_idle_period BOOLEAN DEFAULT FALSE;

-- User sessions for tracking login/logout
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences and learning data
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    learning_goals JSONB DEFAULT '{}',
    interests JSONB DEFAULT '{}',
    learning_pace VARCHAR(50) DEFAULT 'medium',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    preferred_experiments JSONB DEFAULT '[]',
    accessibility_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS adaptive_mode_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS content_difficulty_preference VARCHAR(50);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS flashcard_preference VARCHAR(50);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS preferred_learning_style VARCHAR(50);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dashboard_visibility_settings JSONB DEFAULT '{}';

-- Biomedical signal data storage
CREATE TABLE IF NOT EXISTS signal_data (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE CASCADE,
    signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN ('hrv', 'emg', 'ecg', 'eeg', 'ppg')),
    channel_number INTEGER DEFAULT 1,
    sampling_rate INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    filtered_data JSONB,
    features JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Research analytics for ML insights
CREATE TABLE IF NOT EXISTS analytics_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS concept_id INTEGER;
ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS module_id INTEGER;
ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS metric_source VARCHAR(100);
ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS aggregation_window VARCHAR(50);
ALTER TABLE analytics_data ADD COLUMN IF NOT EXISTS model_version VARCHAR(100);

-- Experiment catalog managed by admin
CREATE TABLE IF NOT EXISTS experiment_catalog (
    id SERIAL PRIMARY KEY,
    experiment_key VARCHAR(100) UNIQUE NOT NULL,
    experiment_name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('basic', 'medium', 'advanced')),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    academic_background VARCHAR(255),
    current_academic_year VARCHAR(100),
    field_of_study VARCHAR(100),
    physiology_familiarity INTEGER,
    signal_processing_familiarity INTEGER,
    hrv_familiarity INTEGER,
    emg_familiarity INTEGER,
    programming_experience VARCHAR(100),
    self_reported_confidence NUMERIC(5,2),
    preferred_language VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_key VARCHAR(150) NOT NULL,
    question_text TEXT,
    response_value TEXT,
    response_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_modules (
    id SERIAL PRIMARY KEY,
    experiment_catalog_id INTEGER REFERENCES experiment_catalog(id) ON DELETE CASCADE,
    module_key VARCHAR(150) UNIQUE NOT NULL,
    module_title VARCHAR(255) NOT NULL,
    module_description TEXT,
    difficulty_level VARCHAR(50),
    estimated_duration_minutes INTEGER,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_sections (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    section_title VARCHAR(255),
    content_body TEXT,
    content_json JSONB DEFAULT '{}',
    media_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_module_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started',
    progress_percentage NUMERIC(5,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_section_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES learning_sections(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started',
    time_spent_seconds INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    scroll_depth_percentage NUMERIC(5,2),
    completion_score NUMERIC(5,2),
    last_accessed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concepts (
    id SERIAL PRIMARY KEY,
    concept_key VARCHAR(150) UNIQUE NOT NULL,
    concept_name VARCHAR(255) NOT NULL,
    description TEXT,
    experiment_type VARCHAR(50),
    difficulty_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concept_prerequisites (
    id SERIAL PRIMARY KEY,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
    prerequisite_concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'requires',
    weight NUMERIC(6,2) DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS module_concepts (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
    importance_weight NUMERIC(6,2) DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS student_concept_mastery (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
    mastery_score NUMERIC(6,2) DEFAULT 0,
    confidence_score NUMERIC(6,2) DEFAULT 0,
    weakness_score NUMERIC(6,2) DEFAULT 0,
    last_assessed_at TIMESTAMP,
    mastery_level VARCHAR(50) DEFAULT 'low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    experiment_catalog_id INTEGER REFERENCES experiment_catalog(id) ON DELETE SET NULL,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE SET NULL,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
    question_type VARCHAR(50) NOT NULL,
    difficulty_level VARCHAR(50),
    question_text TEXT NOT NULL,
    question_data JSONB DEFAULT '{}',
    correct_answer JSONB DEFAULT '{}',
    explanation TEXT,
    expected_time_seconds INTEGER,
    marks NUMERIC(6,2) DEFAULT 1,
    is_pretest_eligible BOOLEAN DEFAULT FALSE,
    is_posttest_eligible BOOLEAN DEFAULT FALSE,
    is_popup_question BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES question_bank(id) ON DELETE CASCADE,
    option_label VARCHAR(20),
    option_text TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_catalog_id INTEGER REFERENCES experiment_catalog(id) ON DELETE SET NULL,
    assessment_type VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_score NUMERIC(8,2),
    max_score NUMERIC(8,2),
    accuracy_percentage NUMERIC(5,2),
    time_spent_seconds INTEGER,
    knowledge_level_inferred VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_session_questions (
    id SERIAL PRIMARY KEY,
    assessment_session_id INTEGER REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES question_bank(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    difficulty_at_serving VARCHAR(50),
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_question_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES question_bank(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE SET NULL,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE SET NULL,
    section_id INTEGER REFERENCES learning_sections(id) ON DELETE SET NULL,
    attempt_number INTEGER DEFAULT 1,
    submitted_answer JSONB DEFAULT '{}',
    is_correct BOOLEAN,
    score_awarded NUMERIC(6,2),
    response_time_seconds NUMERIC(8,2),
    hint_used BOOLEAN DEFAULT FALSE,
    attempt_context VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flashcards (
    id SERIAL PRIMARY KEY,
    experiment_catalog_id INTEGER REFERENCES experiment_catalog(id) ON DELETE SET NULL,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE SET NULL,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
    front_content TEXT,
    back_content TEXT,
    card_type VARCHAR(50),
    difficulty_level VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_flashcard_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id INTEGER REFERENCES flashcards(id) ON DELETE CASCADE,
    times_viewed INTEGER DEFAULT 0,
    times_flipped INTEGER DEFAULT 0,
    marked_known BOOLEAN DEFAULT FALSE,
    marked_difficult BOOLEAN DEFAULT FALSE,
    last_reviewed_at TIMESTAMP,
    spaced_repetition_score NUMERIC(6,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS adaptive_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    rule_type VARCHAR(50),
    condition_json JSONB DEFAULT '{}',
    action_json JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS adaptive_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE SET NULL,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE SET NULL,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
    recommendation_type VARCHAR(50),
    recommendation_text TEXT,
    reason_json JSONB DEFAULT '{}',
    generated_by VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS adaptation_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE SET NULL,
    event_type VARCHAR(100),
    trigger_source VARCHAR(100),
    input_features JSONB DEFAULT '{}',
    decision_output JSONB DEFAULT '{}',
    reasoning_trace JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulation_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE SET NULL,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE SET NULL,
    simulation_type VARCHAR(100),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    parameter_changes_count INTEGER DEFAULT 0,
    completion_status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS simulation_interactions (
    id SERIAL PRIMARY KEY,
    simulation_session_id INTEGER REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    interaction_type VARCHAR(100),
    parameter_name VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    interaction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interaction_context JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    program_name VARCHAR(255),
    semester VARCHAR(100),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_enrollments (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    student_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id SERIAL PRIMARY KEY,
    teacher_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100),
    target_table VARCHAR(100),
    target_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_versions (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    version_number INTEGER DEFAULT 1,
    content_snapshot JSONB DEFAULT '{}',
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_data_exports (
    id SERIAL PRIMARY KEY,
    export_name VARCHAR(255),
    export_type VARCHAR(100),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    filters_json JSONB DEFAULT '{}',
    file_path TEXT,
    record_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_store_student_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id) ON DELETE SET NULL,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE SET NULL,
    feature_vector JSONB DEFAULT '{}',
    label JSONB DEFAULT '{}',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(experiment_type);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_experiment_id ON user_interactions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_signal_data_experiment_id ON signal_data(experiment_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_experiment_catalog_key ON experiment_catalog(experiment_key);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_catalog_id ON learning_modules(experiment_catalog_id);
CREATE INDEX IF NOT EXISTS idx_learning_sections_module_id ON learning_sections(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_module ON student_module_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_section_progress_user_section ON student_section_progress(user_id, section_id);
CREATE INDEX IF NOT EXISTS idx_concept_prereq_concept_id ON concept_prerequisites(concept_id);
CREATE INDEX IF NOT EXISTS idx_module_concepts_module_id ON module_concepts(module_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_concept ON student_concept_mastery(user_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_module_id ON question_bank(module_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON student_question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_activity_user_id ON student_flashcard_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_recommendations_user_id ON adaptive_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_user_id ON simulation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id ON teacher_class_assignments(teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_training_exports_created_by ON training_data_exports(created_by);
CREATE INDEX IF NOT EXISTS idx_feature_store_user_id ON feature_store_student_state(user_id);

-- Create demo user
INSERT INTO users (email, password_hash, first_name, last_name, institution, program_level, field_of_study, role, is_demo)
VALUES (
    'demo@lab.edu',
    '$2b$10$demopasswordhash', -- This would be properly hashed in production
    'Demo',
    'User',
    'Virtual Lab University',
    'undergraduate',
    'biomedical-engineering',
    'student',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, first_name, last_name, institution, program_level, field_of_study, role, is_demo)
VALUES (
    'teacher@lab.edu',
    '$2b$10$demopasswordhash',
    'Teacher',
    'Demo',
    'Virtual Lab University',
    'instructor',
    'biomedical-engineering',
    'teacher',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, first_name, last_name, institution, program_level, field_of_study, role, is_demo)
VALUES (
    'admin@gmail.com',
    '$2b$10$demopasswordhash',
    'Mounish',
    'Admin',
    'Virtual Lab University',
    'instructor',
    'biomedical-engineering',
    'admin',
    FALSE
) ON CONFLICT (email) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- ROW LEVEL SECURITY (SUPABASE)
-- =========================================

CREATE OR REPLACE FUNCTION request_jwt_email()
RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.email', true), '');
$$ LANGUAGE SQL STABLE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_select ON users;
CREATE POLICY users_self_select ON users
    FOR SELECT
    USING (email = request_jwt_email() OR request_jwt_email() = 'admin@gmail.com');

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users
    FOR UPDATE
    USING (email = request_jwt_email() OR request_jwt_email() = 'admin@gmail.com')
    WITH CHECK (email = request_jwt_email() OR request_jwt_email() = 'admin@gmail.com');

DROP POLICY IF EXISTS users_admin_insert ON users;
CREATE POLICY users_admin_insert ON users
    FOR INSERT
    WITH CHECK (request_jwt_email() = 'admin@gmail.com');

DROP POLICY IF EXISTS preferences_self_all ON user_preferences;
CREATE POLICY preferences_self_all ON user_preferences
    FOR ALL
    USING (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_preferences.user_id
              AND u.email = request_jwt_email()
        )
    )
    WITH CHECK (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_preferences.user_id
              AND u.email = request_jwt_email()
        )
    );

DROP POLICY IF EXISTS experiments_self_all ON experiments;
CREATE POLICY experiments_self_all ON experiments
    FOR ALL
    USING (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = experiments.user_id
              AND u.email = request_jwt_email()
        )
    )
    WITH CHECK (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = experiments.user_id
              AND u.email = request_jwt_email()
        )
    );

DROP POLICY IF EXISTS interactions_self_all ON user_interactions;
CREATE POLICY interactions_self_all ON user_interactions
    FOR ALL
    USING (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_interactions.user_id
              AND u.email = request_jwt_email()
        )
    )
    WITH CHECK (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_interactions.user_id
              AND u.email = request_jwt_email()
        )
    );

DROP POLICY IF EXISTS sessions_self_all ON user_sessions;
CREATE POLICY sessions_self_all ON user_sessions
    FOR ALL
    USING (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_sessions.user_id
              AND u.email = request_jwt_email()
        )
    )
    WITH CHECK (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_sessions.user_id
              AND u.email = request_jwt_email()
        )
    );

DROP POLICY IF EXISTS analytics_self_all ON analytics_data;
CREATE POLICY analytics_self_all ON analytics_data
    FOR ALL
    USING (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = analytics_data.user_id
              AND u.email = request_jwt_email()
        )
    )
    WITH CHECK (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = analytics_data.user_id
              AND u.email = request_jwt_email()
        )
    );

DROP POLICY IF EXISTS signal_data_self_all ON signal_data;
CREATE POLICY signal_data_self_all ON signal_data
    FOR ALL
    USING (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1
            FROM experiments e
            JOIN users u ON u.id = e.user_id
            WHERE e.id = signal_data.experiment_id
              AND u.email = request_jwt_email()
        )
    )
    WITH CHECK (
        request_jwt_email() = 'admin@gmail.com'
        OR EXISTS (
            SELECT 1
            FROM experiments e
            JOIN users u ON u.id = e.user_id
            WHERE e.id = signal_data.experiment_id
              AND u.email = request_jwt_email()
        )
    );

DROP POLICY IF EXISTS catalog_public_read ON experiment_catalog;
CREATE POLICY catalog_public_read ON experiment_catalog
    FOR SELECT
    USING (is_active = TRUE OR request_jwt_email() = 'admin@gmail.com');

DROP POLICY IF EXISTS catalog_admin_write ON experiment_catalog;
CREATE POLICY catalog_admin_write ON experiment_catalog
    FOR ALL
    USING (request_jwt_email() = 'admin@gmail.com')
    WITH CHECK (request_jwt_email() = 'admin@gmail.com');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO virtuallab_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO virtuallab_user;

COMMIT;