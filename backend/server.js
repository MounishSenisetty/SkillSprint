const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
const { initializeDatabase } = require('./scripts/init-db');

const app = express();
const PORT = process.env.PORT || 8001;
const STATIC_ROOT = path.resolve(__dirname, '..');

// =========================================
// DATABASE CONNECTION
// =========================================

const useConnectionString = !!process.env.DATABASE_URL;
const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true' || useConnectionString;
const autoInitDatabase = String(process.env.AUTO_INIT_DB || '').toLowerCase() === 'true';
const allowedOrigins = new Set(
    [
        process.env.FRONTEND_URL,
        ...(process.env.FRONTEND_URLS || '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
    ].filter(Boolean)
);

const ROLE_VALUES = new Set(['student', 'teacher', 'admin']);

function normalizeProgramLevel(programLevel) {
    const value = String(programLevel || '').trim().toLowerCase();
    const map = {
        doctoral: 'phd',
        phd: 'phd',
        faculty: 'instructor',
        professional: 'instructor'
    };

    if (!value) return null;
    return map[value] || value;
}

function normalizeRole(role) {
    const value = String(role || '').trim().toLowerCase();
    if (!value) return 'student';
    return ROLE_VALUES.has(value) ? value : 'student';
}

function buildAdaptiveFeedback(stats = []) {
    const weaknesses = [];
    const strengths = [];
    const recommendations = [];

    for (const item of stats) {
        const accuracy = Number(item.avg_accuracy || 0);
        const responseTime = Number(item.avg_response_time_ms || 0);
        const topic = item.page_section || item.interaction_type || 'general';

        if (accuracy < 0.6 || (responseTime > 0 && responseTime > 120000)) {
            weaknesses.push({ topic, accuracy, responseTimeMs: responseTime });
        } else if (accuracy >= 0.8) {
            strengths.push({ topic, accuracy, responseTimeMs: responseTime });
        }
    }

    if (weaknesses.some((w) => String(w.topic).toLowerCase().includes('frequency'))) {
        recommendations.push('Review prerequisite concepts for frequency-domain analysis before continuing.');
    }
    if (weaknesses.some((w) => String(w.topic).toLowerCase().includes('signal'))) {
        recommendations.push('Revisit signal filtering basics and run guided simulation mode.');
    }
    if (weaknesses.length > 0) {
        recommendations.push('Switch to adaptive practice mode with additional step-by-step hints.');
    }
    if (recommendations.length === 0) {
        recommendations.push('Keep current pace and proceed to advanced questions.');
    }

    return {
        strengths,
        weaknesses,
        recommendations,
        mastery_level: weaknesses.length > strengths.length ? 'developing' : 'proficient'
    };
}

function validateDbConfig() {
    if (useConnectionString) {
        try {
            const parsed = new URL(process.env.DATABASE_URL);
            if (!parsed.password) {
                throw new Error('DATABASE_URL is missing password.');
            }
        } catch (err) {
            throw new Error(`Invalid DATABASE_URL: ${err.message}`);
        }
        return;
    }

    if (!process.env.DB_PASSWORD) {
        console.warn('⚠️ DB_PASSWORD is empty. Set DB_PASSWORD for local Postgres or use DATABASE_URL for Supabase.');
    }
}

validateDbConfig();

const pool = new Pool(
    useConnectionString
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: useSsl
                  ? {
                        rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'true'
                    }
                  : false
          }
        : {
              user: process.env.DB_USER || 'postgres',
              host: process.env.DB_HOST || 'localhost',
              database: process.env.DB_NAME || 'virtuallab_db',
              password: String(process.env.DB_PASSWORD ?? ''),
              port: process.env.DB_PORT || 5432,
              ssl: useSsl
                  ? {
                        rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'true'
                    }
                  : false
          }
);

async function ensureAuthSchema() {
    try {
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'
            CHECK (role IN ('student', 'teacher', 'admin'))
        `);
    } catch (err) {
        // 42P01 means the users table is not created yet (fresh setup before init-db).
        if (err.code === '42P01') {
            return;
        }
        throw err;
    }
}

ensureAuthSchema()
    .then(() => console.log('✅ Auth schema verified'))
    .catch((err) => {
        if (String(err?.message || '').includes('relation "users" does not exist')) {
            return;
        }
        console.warn('⚠️ Unable to verify auth schema:', err.message);
    });

// Test database connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL database'))
    .catch(err => {
        console.error('❌ Database connection error:', err);
        console.log('🔄 Falling back to in-memory storage for demo purposes');
    });

// =========================================
// MIDDLEWARE
// =========================================

app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(STATIC_ROOT));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// =========================================
// AUTH MIDDLEWARE
// =========================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'virtuallab_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...allowedRoles) => {
    const normalized = new Set(allowedRoles.map((role) => normalizeRole(role)));

    return (req, res, next) => {
        const role = normalizeRole(req.user?.role);
        if (!normalized.has(role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }
        next();
    };
};

// =========================================
// HEALTH CHECK
// =========================================

app.get('/', (_req, res) => {
    res.sendFile(path.join(STATIC_ROOT, 'index.html'));
});

app.get('/api/v1/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: pool.totalCount > 0 ? 'connected' : 'disconnected'
    });
});

// =========================================
// AUTHENTICATION ROUTES
// =========================================

app.post('/api/v1/lab/auth/register', async (req, res) => {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            institution,
            programLevel,
            fieldOfStudy,
            learningGoals,
            interests,
            learningPace,
            notifications
        } = req.body;
        const normalizedProgramLevel = normalizeProgramLevel(programLevel);
        const accountRole = 'student';
        
        console.log('🔐 Registration attempt for:', email);

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, institution, program_level, field_of_study, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, first_name, last_name, role`,
            [email, passwordHash, firstName, lastName, institution, normalizedProgramLevel, fieldOfStudy, accountRole]
        );

        const user = result.rows[0];

        await pool.query(
            `INSERT INTO user_preferences (user_id, learning_goals, interests, learning_pace, notifications_enabled)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                user.id,
                JSON.stringify(Array.isArray(learningGoals) ? learningGoals : []),
                JSON.stringify(Array.isArray(interests) ? interests : []),
                learningPace || 'medium',
                notifications !== false
            ]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'virtuallab_secret_key',
            { expiresIn: '24h' }
        );

        console.log('✅ User registered successfully:', user.email);

        res.status(201).json({
            access_token: token,
            token_type: 'Bearer',
            expires_in: 24 * 60 * 60,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });

    } catch (err) {
        console.error('❌ Registration error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/v1/lab/auth/login', async (req, res) => {
    try {
        const { email, password, remember_me } = req.body;
        
        console.log('🔑 Login attempt for:', email);

        // Find user in database
        const result = await pool.query(
            'SELECT id, email, password_hash, first_name, last_name, is_demo, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Verify password hash for all accounts (including demo role accounts).
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const tokenExpiry = remember_me ? '30d' : '24h';
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: normalizeRole(user.role) },
            process.env.JWT_SECRET || 'virtuallab_secret_key',
            { expiresIn: tokenExpiry }
        );

        console.log('✅ Login successful for:', user.email);

        res.json({
            access_token: token,
            token_type: 'Bearer',
            expires_in: remember_me ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                is_demo: user.is_demo,
                role: normalizeRole(user.role)
            }
        });

    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/v1/lab/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, first_name, last_name, institution, program_level, field_of_study, is_demo, role FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                ...user,
                role: normalizeRole(user.role)
            }
        });
    } catch (err) {
        console.error('❌ Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

app.get('/api/v1/lab/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            userId: req.user.userId,
            email: req.user.email,
            role: normalizeRole(req.user.role)
        }
    });
});

app.get('/api/v1/lab/users', authenticateToken, authorizeRoles('teacher', 'admin'), async (_req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, first_name, last_name, institution, program_level, field_of_study, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users: result.rows });
    } catch (err) {
        console.error('❌ User list error:', err);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

app.delete('/api/v1/lab/auth/account', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body || {};
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT id, email, password_hash, is_demo FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (!user.is_demo) {
            if (!password) {
                return res.status(400).json({ error: 'Password is required to delete account' });
            }

            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (!passwordValid) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        }

        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({
            status: 'deleted',
            message: 'Account and associated data deleted successfully'
        });
    } catch (err) {
        console.error('❌ Delete account error:', err);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// =========================================
// EXPERIMENT ROUTES
// =========================================

app.post('/api/v1/lab/experiments/start', authenticateToken, async (req, res) => {
    try {
        const { experiment_type, experiment_name, parameters } = req.body;
        const userId = req.user.userId;

        console.log('🧪 Starting experiment:', experiment_type, 'for user:', userId);

        const result = await pool.query(
            `INSERT INTO experiments (user_id, experiment_type, experiment_name, parameters)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, experiment_type, experiment_name, JSON.stringify(parameters)]
        );

        const experimentId = result.rows[0].id;

        res.json({
            experiment_id: experimentId,
            status: 'started',
            message: 'Experiment session created successfully'
        });

    } catch (err) {
        console.error('❌ Start experiment error:', err);
        res.status(500).json({ error: 'Failed to start experiment' });
    }
});

app.put('/api/v1/lab/experiments/:id', authenticateToken, async (req, res) => {
    try {
        const experimentId = req.params.id;
        const userId = req.user.userId;
        const updateData = req.body;

        console.log('📊 Updating experiment:', experimentId);

        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let valueIndex = 1;

        if (updateData.raw_signals) {
            updateFields.push(`raw_signals = $${valueIndex++}`);
            values.push(JSON.stringify(updateData.raw_signals));
        }
        if (updateData.processed_signals) {
            updateFields.push(`processed_signals = $${valueIndex++}`);
            values.push(JSON.stringify(updateData.processed_signals));
        }
        if (updateData.features_extracted) {
            updateFields.push(`features_extracted = $${valueIndex++}`);
            values.push(JSON.stringify(updateData.features_extracted));
        }
        if (updateData.results) {
            updateFields.push(`results = $${valueIndex++}`);
            values.push(JSON.stringify(updateData.results));
        }
        if (updateData.status) {
            updateFields.push(`status = $${valueIndex++}`);
            values.push(updateData.status);
            
            if (updateData.status === 'completed') {
                updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(experimentId, userId);
        
        const query = `
            UPDATE experiments 
            SET ${updateFields.join(', ')}
            WHERE id = $${valueIndex++} AND user_id = $${valueIndex++}
            RETURNING id, status
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Experiment not found' });
        }

        res.json({
            experiment_id: experimentId,
            status: result.rows[0].status,
            message: 'Experiment updated successfully'
        });

    } catch (err) {
        console.error('❌ Update experiment error:', err);
        res.status(500).json({ error: 'Failed to update experiment' });
    }
});

// =========================================
// INTERACTION LOGGING
// =========================================

app.post('/api/v1/lab/interactions/log', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            experiment_id,
            interaction_type,
            page_section,
            interaction_data,
            context,
            mouse_coordinates,
            viewport_size,
            accuracy
        } = req.body;

        await pool.query(
            `INSERT INTO user_interactions 
             (user_id, experiment_id, interaction_type, page_section, interaction_data, context, mouse_coordinates, viewport_size, accuracy)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                experiment_id,
                interaction_type,
                page_section,
                JSON.stringify(interaction_data),
                JSON.stringify(context),
                JSON.stringify(mouse_coordinates),
                JSON.stringify(viewport_size),
                accuracy
            ]
        );

        res.json({ status: 'logged' });

    } catch (err) {
        console.error('❌ Log interaction error:', err);
        res.status(500).json({ error: 'Failed to log interaction' });
    }
});

// =========================================
// LEARNING CONTENT ROUTES
// =========================================

app.get('/api/v1/lab/content/catalog', async (_req, res) => {
    try {
        const catalog = await pool.query(
            `SELECT
                ec.id,
                ec.experiment_key,
                ec.experiment_name,
                ec.description,
                ec.difficulty_level,
                ec.is_active,
                COUNT(DISTINCT lm.id) AS module_count,
                COUNT(DISTINCT qb.id) AS question_count,
                COUNT(DISTINCT fc.id) AS flashcard_count
             FROM experiment_catalog ec
             LEFT JOIN learning_modules lm ON lm.experiment_catalog_id = ec.id AND lm.is_active = TRUE
             LEFT JOIN question_bank qb ON qb.experiment_catalog_id = ec.id AND qb.is_active = TRUE
             LEFT JOIN flashcards fc ON fc.experiment_catalog_id = ec.id AND fc.is_active = TRUE
             WHERE ec.is_active = TRUE
             GROUP BY ec.id
             ORDER BY ec.created_at ASC`
        );

        res.json({ experiments: catalog.rows, generated_at: new Date().toISOString() });
    } catch (err) {
        console.error('❌ Content catalog error:', err);
        res.status(500).json({ error: 'Failed to get content catalog' });
    }
});

app.get('/api/v1/lab/content/:experimentKey/questions', async (req, res) => {
    try {
        const { experimentKey } = req.params;
        const moduleKey = String(req.query.moduleKey || '').trim() || null;

        const experimentResult = await pool.query(
            `SELECT id, experiment_key, experiment_name
             FROM experiment_catalog
             WHERE experiment_key = $1 AND is_active = TRUE
             LIMIT 1`,
            [experimentKey]
        );

        if (experimentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Experiment content not found' });
        }

        const params = [experimentKey];
        let moduleFilter = '';
        if (moduleKey) {
            params.push(moduleKey);
            moduleFilter = 'AND lm.module_key = $2';
        }

        const questions = await pool.query(
            `SELECT
                qb.id,
                qb.question_type,
                qb.difficulty_level,
                qb.question_text,
                qb.question_data,
                qb.correct_answer,
                qb.explanation,
                qb.expected_time_seconds,
                qb.marks,
                qb.is_pretest_eligible,
                qb.is_posttest_eligible,
                qb.is_popup_question,
                lm.module_key,
                lm.module_title,
                c.concept_key,
                c.concept_name
             FROM question_bank qb
             JOIN experiment_catalog ec ON ec.id = qb.experiment_catalog_id
             LEFT JOIN learning_modules lm ON lm.id = qb.module_id
             LEFT JOIN concepts c ON c.id = qb.concept_id
             WHERE ec.experiment_key = $1
               AND qb.is_active = TRUE
               ${moduleFilter}
             ORDER BY lm.display_order ASC NULLS LAST, qb.id ASC`,
            params
        );

        const questionIds = questions.rows.map((row) => row.id);
        const optionRows = questionIds.length === 0
            ? []
            : (await pool.query(
                  `SELECT question_id, option_label, option_text, is_correct, feedback, display_order
                   FROM question_options
                   WHERE question_id = ANY($1::int[])
                   ORDER BY question_id ASC, display_order ASC`,
                  [questionIds]
              )).rows;

        const optionsByQuestion = optionRows.reduce((acc, option) => {
            if (!acc[option.question_id]) {
                acc[option.question_id] = [];
            }
            acc[option.question_id].push(option);
            return acc;
        }, {});

        res.json({
            experiment: experimentResult.rows[0],
            questions: questions.rows.map((question) => ({
                ...question,
                options: optionsByQuestion[question.id] || []
            })),
            generated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Content questions error:', err);
        res.status(500).json({ error: 'Failed to get experiment questions' });
    }
});

app.get('/api/v1/lab/content/:experimentKey/flashcards', async (req, res) => {
    try {
        const { experimentKey } = req.params;
        const moduleKey = String(req.query.moduleKey || '').trim() || null;

        const params = [experimentKey];
        let moduleFilter = '';
        if (moduleKey) {
            params.push(moduleKey);
            moduleFilter = 'AND lm.module_key = $2';
        }

        const flashcards = await pool.query(
            `SELECT
                fc.id,
                fc.front_content,
                fc.back_content,
                fc.card_type,
                fc.difficulty_level,
                lm.module_key,
                lm.module_title,
                c.concept_key,
                c.concept_name
             FROM flashcards fc
             JOIN experiment_catalog ec ON ec.id = fc.experiment_catalog_id
             LEFT JOIN learning_modules lm ON lm.id = fc.module_id
             LEFT JOIN concepts c ON c.id = fc.concept_id
             WHERE ec.experiment_key = $1
               AND fc.is_active = TRUE
               ${moduleFilter}
             ORDER BY lm.display_order ASC NULLS LAST, fc.id ASC`,
            params
        );

        res.json({ flashcards: flashcards.rows, generated_at: new Date().toISOString() });
    } catch (err) {
        console.error('❌ Content flashcards error:', err);
        res.status(500).json({ error: 'Failed to get experiment flashcards' });
    }
});

app.get('/api/v1/lab/content/:experimentKey', async (req, res) => {
    try {
        const { experimentKey } = req.params;
        const experimentResult = await pool.query(
            `SELECT id, experiment_key, experiment_name, description, difficulty_level, is_active, created_at
             FROM experiment_catalog
             WHERE experiment_key = $1 AND is_active = TRUE
             LIMIT 1`,
            [experimentKey]
        );

        if (experimentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Experiment content not found' });
        }

        const experiment = experimentResult.rows[0];
        const modulesResult = await pool.query(
            `SELECT id, module_key, module_title, module_description, difficulty_level, estimated_duration_minutes, display_order
             FROM learning_modules
             WHERE experiment_catalog_id = $1 AND is_active = TRUE
             ORDER BY display_order ASC, id ASC`,
            [experiment.id]
        );

        const moduleIds = modulesResult.rows.map((module) => module.id);
        const sectionsResult = moduleIds.length === 0
            ? { rows: [] }
            : await pool.query(
                  `SELECT id, module_id, section_type, section_title, content_body, content_json, display_order, is_required
                   FROM learning_sections
                   WHERE module_id = ANY($1::int[])
                   ORDER BY module_id ASC, display_order ASC, id ASC`,
                  [moduleIds]
              );

        const conceptsResult = moduleIds.length === 0
            ? { rows: [] }
            : await pool.query(
                  `SELECT
                        mc.module_id,
                        mc.importance_weight,
                        c.id,
                        c.concept_key,
                        c.concept_name,
                        c.description,
                        c.difficulty_level
                   FROM module_concepts mc
                   JOIN concepts c ON c.id = mc.concept_id
                   WHERE mc.module_id = ANY($1::int[])
                   ORDER BY mc.module_id ASC, mc.importance_weight DESC, c.concept_name ASC`,
                  [moduleIds]
              );

        const adaptiveRulesResult = await pool.query(
            `SELECT id, rule_name, rule_description, rule_type, condition_json, action_json, priority
             FROM adaptive_rules
             WHERE is_active = TRUE
               AND condition_json ->> 'experiment_key' = $1
             ORDER BY priority DESC, id ASC`,
            [experimentKey]
        );

        const sectionsByModule = sectionsResult.rows.reduce((acc, section) => {
            if (!acc[section.module_id]) {
                acc[section.module_id] = [];
            }
            acc[section.module_id].push(section);
            return acc;
        }, {});

        const conceptsByModule = conceptsResult.rows.reduce((acc, concept) => {
            if (!acc[concept.module_id]) {
                acc[concept.module_id] = [];
            }
            acc[concept.module_id].push({
                id: concept.id,
                concept_key: concept.concept_key,
                concept_name: concept.concept_name,
                description: concept.description,
                difficulty_level: concept.difficulty_level,
                importance_weight: concept.importance_weight
            });
            return acc;
        }, {});

        const questionCountResult = await pool.query(
            `SELECT COUNT(*) AS count
             FROM question_bank qb
             WHERE qb.experiment_catalog_id = $1 AND qb.is_active = TRUE`,
            [experiment.id]
        );

        const flashcardCountResult = await pool.query(
            `SELECT COUNT(*) AS count
             FROM flashcards fc
             WHERE fc.experiment_catalog_id = $1 AND fc.is_active = TRUE`,
            [experiment.id]
        );

        res.json({
            experiment: {
                ...experiment,
                question_count: Number(questionCountResult.rows[0]?.count || 0),
                flashcard_count: Number(flashcardCountResult.rows[0]?.count || 0)
            },
            modules: modulesResult.rows.map((module) => ({
                ...module,
                sections: sectionsByModule[module.id] || [],
                concepts: conceptsByModule[module.id] || []
            })),
            adaptive_rules: adaptiveRulesResult.rows,
            generated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Content overview error:', err);
        res.status(500).json({ error: 'Failed to get experiment content' });
    }
});

// =========================================
// ANALYTICS ROUTES
// =========================================

app.get('/api/v1/lab/analytics/user-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user experiment statistics
        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_experiments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_experiments,
                AVG(duration_minutes) as avg_duration,
                experiment_type,
                COUNT(*) as type_count
             FROM experiments 
             WHERE user_id = $1 
             GROUP BY experiment_type`,
            [userId]
        );

        // Get interaction statistics
        const interactions = await pool.query(
            `SELECT 
                interaction_type,
                COUNT(*) as count,
                AVG(accuracy) as avg_accuracy
             FROM user_interactions 
             WHERE user_id = $1 
             GROUP BY interaction_type`,
            [userId]
        );

        res.json({
            experiments: stats.rows,
            interactions: interactions.rows,
            generated_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('❌ Analytics error:', err);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

app.get('/api/v1/lab/adaptive/feedback', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const stats = await pool.query(
            `SELECT
                COALESCE(page_section, interaction_type, 'general') AS page_section,
                interaction_type,
                AVG(COALESCE(accuracy, 0)) AS avg_accuracy,
                AVG(COALESCE(response_time_ms, 0)) AS avg_response_time_ms,
                COUNT(*) AS attempts
             FROM user_interactions
             WHERE user_id = $1
             GROUP BY COALESCE(page_section, interaction_type, 'general'), interaction_type`,
            [userId]
        );

        const feedback = buildAdaptiveFeedback(stats.rows);

        await pool.query(
            `INSERT INTO analytics_data (user_id, metric_type, metric_value, metadata)
             VALUES ($1, $2, $3, $4)`,
            [
                userId,
                'adaptive_feedback_score',
                feedback.mastery_level === 'proficient' ? 0.8 : 0.5,
                JSON.stringify(feedback)
            ]
        );

        res.json({
            user_id: userId,
            generated_at: new Date().toISOString(),
            ...feedback
        });
    } catch (err) {
        console.error('❌ Adaptive feedback error:', err);
        res.status(500).json({ error: 'Failed to generate adaptive feedback' });
    }
});

app.get('/api/v1/lab/teacher/students-overview', authenticateToken, authorizeRoles('teacher', 'admin'), async (_req, res) => {
    try {
        const students = await pool.query(
            `SELECT
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                COUNT(DISTINCT e.id) AS experiments_started,
                COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS experiments_completed,
                AVG(ui.accuracy) AS avg_accuracy,
                AVG(ui.response_time_ms) AS avg_response_time_ms
             FROM users u
             LEFT JOIN experiments e ON e.user_id = u.id
             LEFT JOIN user_interactions ui ON ui.user_id = u.id
             WHERE u.role = 'student'
             GROUP BY u.id, u.email, u.first_name, u.last_name
             ORDER BY u.created_at DESC`
        );

        res.json({ students: students.rows, generated_at: new Date().toISOString() });
    } catch (err) {
        console.error('❌ Teacher overview error:', err);
        res.status(500).json({ error: 'Failed to get students overview' });
    }
});

app.get('/api/v1/lab/admin/overview', authenticateToken, authorizeRoles('admin'), async (_req, res) => {
    try {
        const roleCounts = await pool.query(
            `SELECT role, COUNT(*) AS count
             FROM users
             GROUP BY role`
        );

        const usage = await pool.query(
            `SELECT
                COUNT(*) AS total_experiments,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_experiments
             FROM experiments`
        );

        const catalog = await pool.query('SELECT id, experiment_key, experiment_name, is_active, created_at FROM experiment_catalog ORDER BY created_at DESC');

        res.json({
            roles: roleCounts.rows,
            usage: usage.rows[0] || {},
            catalog: catalog.rows,
            generated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Admin overview error:', err);
        res.status(500).json({ error: 'Failed to get admin overview' });
    }
});

app.put('/api/v1/lab/admin/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const nextRole = normalizeRole(req.body.role);

        const targetUserResult = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
        if (targetUserResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = targetUserResult.rows[0];

        // Singleton admin policy.
        if (nextRole === 'admin' && targetUser.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Only admin@gmail.com can hold admin role' });
        }
        if (targetUser.email === 'admin@gmail.com' && nextRole !== 'admin') {
            return res.status(403).json({ error: 'admin@gmail.com must remain admin' });
        }

        const result = await pool.query(
            `UPDATE users
             SET role = $1
             WHERE id = $2
             RETURNING id, email, role`,
            [nextRole, userId]
        );

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('❌ Update role error:', err);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

app.post('/api/v1/lab/admin/experiments', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const { experiment_key, experiment_name, description, difficulty_level } = req.body;
        if (!experiment_key || !experiment_name) {
            return res.status(400).json({ error: 'experiment_key and experiment_name are required' });
        }

        const result = await pool.query(
            `INSERT INTO experiment_catalog (experiment_key, experiment_name, description, difficulty_level, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, experiment_key, experiment_name, is_active`,
            [experiment_key, experiment_name, description || null, difficulty_level || 'medium', req.user.userId]
        );

        res.status(201).json({ experiment: result.rows[0] });
    } catch (err) {
        console.error('❌ Create experiment catalog error:', err);
        res.status(500).json({ error: 'Failed to create experiment catalog item' });
    }
});

// =========================================
// DATA EXPORT
// =========================================

app.get('/api/v1/lab/data/export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const format = req.query.format || 'json';

        // Export user data
        const experiments = await pool.query(
            'SELECT * FROM experiments WHERE user_id = $1',
            [userId]
        );

        const interactions = await pool.query(
            'SELECT * FROM user_interactions WHERE user_id = $1',
            [userId]
        );

        const exportData = {
            user_id: userId,
            exported_at: new Date().toISOString(),
            experiments: experiments.rows,
            interactions: interactions.rows,
            format: format
        };

        if (format === 'json') {
            res.json(exportData);
        } else {
            res.status(400).json({ error: 'Unsupported format' });
        }

    } catch (err) {
        console.error('❌ Export error:', err);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// =========================================
// ERROR HANDLING
// =========================================

app.use((err, req, res, next) => {
    console.error('🔥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =========================================
// START SERVER
// =========================================

async function startServer() {
    app.listen(PORT, () => {
        console.log('🚀 Virtual Lab Backend Server running on port', PORT);
        console.log('📡 API Base URL:', `/api/v1 on port ${PORT}`);
        console.log('🌐 Static frontend root:', STATIC_ROOT);
    });

    if (autoInitDatabase) {
        // Do not block HTTP startup on DB bootstrapping; Render health checks need the server online.
        const maxAttempts = Number(process.env.AUTO_INIT_DB_RETRIES || 5);
        const retryDelayMs = Number(process.env.AUTO_INIT_DB_RETRY_DELAY_MS || 15000);

        let attempt = 0;
        const runInit = async () => {
            attempt += 1;
            try {
                console.log(`🔄 AUTO_INIT_DB enabled. Running database initialization (attempt ${attempt}/${maxAttempts})...`);
                await initializeDatabase();
                console.log('✅ AUTO_INIT_DB finished successfully.');
            } catch (err) {
                console.error(`❌ AUTO_INIT_DB failed on attempt ${attempt}:`, err.message || err);
                if (attempt < maxAttempts) {
                    console.log(`⏳ Retrying database initialization in ${retryDelayMs}ms...`);
                    setTimeout(runInit, retryDelayMs);
                } else {
                    console.error('⚠️ AUTO_INIT_DB exhausted retries. Server remains up; retry manually with `npm run init-db` in backend.');
                }
            }
        };

        setTimeout(runInit, 0);
    }
}

if (require.main === module) {
    startServer().catch((err) => {
        console.error('❌ Server startup failed:', err);
        process.exit(1);
    });
}

module.exports = app;