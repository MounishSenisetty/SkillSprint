/* =========================================
   Authentication System — JavaScript
   ========================================= */

(function() {
    'use strict';

    // =========================================
    // GLOBAL STATE
    // =========================================

    const state = {
        currentStep: 1,
        maxStep: 3,
        formData: {},
        isSubmitting: false,
        validationRules: {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
            name: /^[a-zA-Z\s]{2,50}$/
        }
    };

    // =========================================
    // DOM ELEMENTS
    // =========================================

    let elements = {};

    // =========================================
    // INITIALIZATION
    // =========================================

    function init() {
        console.log('🚀 Auth system initializing...');
        
        // Get current page
        const currentPage = getCurrentPage();
        console.log('📄 Current page detected as:', currentPage);
        
        // Initialize based on page
        if (currentPage === 'login') {
            console.log('🔑 Setting up login page...');
            initLoginPage();
        } else if (currentPage === 'register') {
            console.log('📝 Setting up register page...');
            initRegisterPage();
        }
        
        // Check if user is already authenticated
        checkAuthStatus();
        
        console.log('✅ Auth system initialization complete');
    }

    function getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('login.html')) return 'login';
        if (path.includes('register.html')) return 'register';
        return 'unknown';
    }

    function getPostLoginPath(user) {
        const role = String(user?.role || '').toLowerCase();
        if (role === 'teacher') return 'teacher-dashboard.html';
        if (role === 'admin') return 'admin-dashboard.html';
        return 'user-dashboard.html';
    }

    function checkAuthStatus() {
        const userData = getUserData();
        const token = localStorage.getItem('authToken');
        
        if (userData && token) {
            // User is authenticated, redirect to main app
            const currentPage = getCurrentPage();
            if (currentPage !== 'unknown') {
                window.location.href = getPostLoginPath(userData);
            }
            return;
        }

        // Sync session from Supabase if local auth is missing
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            return;
        }

        supabaseClient.auth.getSession()
            .then(({ data, error }) => {
                if (error || !data?.session) {
                    return;
                }

                const mappedUser = persistSupabaseSession({
                    user: data.session.user,
                    session: data.session
                });

                if (!mappedUser) {
                    return;
                }

                const currentPage = getCurrentPage();
                if (currentPage !== 'unknown') {
                    window.location.href = getPostLoginPath(mappedUser);
                }
            })
            .catch(sessionError => {
                console.warn('⚠️ Unable to sync Supabase session:', sessionError?.message || sessionError);
            });
    }

    function getSupabaseClient() {
        if (typeof window === 'undefined') {
            return null;
        }

        return window.supabaseLabClient || null;
    }

    function mapSupabaseUserToLocalUser(user, emailFallback = '') {
        if (!user) return null;

        const metadata = user.user_metadata || {};
        const firstName = metadata.firstName || metadata.first_name || '';
        const lastName = metadata.lastName || metadata.last_name || '';

        return {
            id: user.id,
            email: user.email || emailFallback,
            firstName,
            lastName,
            first_name: firstName,
            last_name: lastName,
            name: (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (user.email || emailFallback),
            institution: metadata.institution || '',
            programLevel: metadata.programLevel || metadata.program_level || '',
            fieldOfStudy: metadata.fieldOfStudy || metadata.field_of_study || '',
            learningGoals: metadata.learningGoals || metadata.learning_goals || [],
            interests: metadata.interests || [],
            learningPace: metadata.learningPace || metadata.learning_pace || '',
            notifications: metadata.notifications !== false,
            registeredAt: user.created_at || new Date().toISOString(),
            userId: user.id,
            source: 'supabase-auth'
        };
    }

    function persistSupabaseSession(authPayload, rememberMe = false) {
        const user = authPayload?.user || authPayload?.session?.user;
        const session = authPayload?.session || null;

        if (!user) {
            return null;
        }

        const mappedUser = mapSupabaseUserToLocalUser(user);
        const accessToken = session?.access_token || generateAuthToken();

        localStorage.setItem('authToken', accessToken);
        localStorage.setItem('currentUser', JSON.stringify(mappedUser));

        if (rememberMe && session?.expires_at) {
            localStorage.setItem('authExpiry', new Date(session.expires_at * 1000).toISOString());
        }

        return mappedUser;
    }

    async function signInWithSupabase(email, password, rememberMe) {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            return null;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error(error.message || 'Supabase sign-in failed');
        }

        const mappedUser = persistSupabaseSession(data, rememberMe);
        if (!mappedUser) {
            throw new Error('Supabase did not return a valid user session');
        }

        return {
            user: mappedUser,
            access_token: data.session?.access_token || localStorage.getItem('authToken')
        };
    }

    async function registerWithSupabase(userData) {
        const supabaseClient = getSupabaseClient();
        if (!supabaseClient) {
            return null;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    institution: userData.institution,
                    programLevel: userData.programLevel,
                    fieldOfStudy: userData.fieldOfStudy,
                    labExperience: userData.labExperience,
                    learningGoals: userData.learningGoals,
                    interests: userData.interests,
                    learningPace: userData.learningPace,
                    notifications: userData.notifications
                }
            }
        });

        if (error) {
            throw new Error(error.message || 'Supabase sign-up failed');
        }

        return data;
    }

    // =========================================
    // LOGIN PAGE
    // =========================================

    function initLoginPage() {
        console.log('🔑 Initializing login page elements...');
        
        elements = {
            loginForm: document.getElementById('login-form'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            loginBtn: document.getElementById('login-btn'),
            rememberMe: document.getElementById('remember-me'),
            loadingScreen: document.getElementById('loading-screen'),
            errorModal: document.getElementById('error-modal')
        };
        
        console.log('📋 Elements found:', {
            loginForm: !!elements.loginForm,
            email: !!elements.email,
            password: !!elements.password,
            loginBtn: !!elements.loginBtn,
            rememberMe: !!elements.rememberMe,
            loadingScreen: !!elements.loadingScreen,
            errorModal: !!elements.errorModal
        });

        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLogin);
        }

        // Real-time validation
        if (elements.email) {
            elements.email.addEventListener('blur', validateEmail);
            elements.email.addEventListener('input', clearError);
        }

        if (elements.password) {
            elements.password.addEventListener('blur', validatePassword);
            elements.password.addEventListener('input', clearError);
        }
        
        // Update debug panel with user count
        updateDebugInfo();
    }

    async function handleLogin(e) {
        e.preventDefault();
        
        if (state.isSubmitting) return;
        
        const email = elements.email.value.trim();
        const password = elements.password.value;
        const rememberMe = elements.rememberMe.checked;

        // Validate inputs
        if (!validateEmail() || !validatePassword()) {
            return;
        }

        state.isSubmitting = true;
        updateLoginButton(true);

        try {
            // Primary auth path: Supabase
            if (getSupabaseClient()) {
                try {
                    const response = await signInWithSupabase(email, password, rememberMe);

                    console.log('✅ Supabase authentication successful!');
                    console.log('👤 Welcome back:', response.user.firstName || '', response.user.lastName || '');

                    showLoadingScreen('Signing in...', 'Welcome back! Connected to Supabase...');

                    setTimeout(() => {
                        window.location.href = getPostLoginPath(response.user);
                    }, 1500);

                    return;
                } catch (supabaseError) {
                    console.warn('⚠️ Supabase login failed, trying legacy fallback:', supabaseError.message);
                }
            }

            console.log('🔑 Attempting backend authentication...');
            
            let backendHealthy = false;
            
            // Check if API client is available and backend is healthy
            if (typeof window.labAPI !== 'undefined') {
                try {
                    backendHealthy = await window.labAPI.healthCheck();
                } catch (apiError) {
                    console.warn('⚠️ API health check failed:', apiError);
                    backendHealthy = false;
                }
            } else {
                console.warn('⚠️ API client not available, using local authentication only');
            }
            
            if (backendHealthy) {
                try {
                    // Try backend login
                    const response = await window.labAPI.login(email, password, rememberMe);
                    
                    console.log('✅ Backend authentication successful!');
                    console.log('👤 Welcome back:', response.user.first_name, response.user.last_name);
                    
                    // Track login
                    window.labAPI.trackFormSubmission(
                        document.querySelector('#login-form, form'), 
                        true, 
                        []
                    );
                    
                    // Create local session backup
                    await createUserSession(email, rememberMe, response.user, response.access_token);
                    
                    showLoadingScreen('Signing in...', 'Welcome back! Your data is synced with the database...');
                    
                    setTimeout(() => {
                        window.location.href = getPostLoginPath(response.user);
                    }, 2000);
                    
                    return; // Exit function on successful backend login
                    
                } catch (apiError) {
                    console.error('❌ Backend login failed:', apiError);
                    throw new Error(apiError?.message || 'Invalid email or password');
                }
            } else {
                console.warn('⚠️ Backend unavailable - checking local storage...');
            }
            
            // Fallback to local authentication
            const isValidUser = await validateCredentials(email, password);
            
            if (isValidUser) {
                console.log('✅ Local authentication successful');
                
                // Create local session
                const userData = await createUserSession(email, rememberMe, isValidUser);
                
                let message = 'Welcome back! ';
                if (!backendHealthy) {
                    message += '(Using offline mode - database unavailable)';
                } else {
                    message += 'Redirecting to laboratory...';
                }
                
                showLoadingScreen('Signing in...', message);
                
                // Log successful login
                console.log('User logged in locally:', {
                    email: userData.email,
                    name: userData.firstName + ' ' + userData.lastName,
                    isDemo: userData.isDemo || false,
                    loginTime: new Date().toISOString(),
                    mode: 'offline'
                });
                
                setTimeout(() => {
                    window.location.href = getPostLoginPath(userData);
                }, 2000);
            } else {
                throw new Error('Invalid email or password');
            }
            
        } catch (error) {
            console.error('❌ Login failed completely:', error);
            showErrorModal('Login Failed', error.message);
        } finally {
            state.isSubmitting = false;
            updateLoginButton(false);
        }
    }

    async function validateCredentials(email, password) {
        // Check if user exists in localStorage
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const user = registeredUsers.find(u => u.email === email);
        
        if (user && user.password === password) {
            return user;
        }
        
        // Demo accounts with full user profiles
        const demoAccounts = [
            { 
                email: 'demo@lab.edu', 
                password: 'Demo123!', 
                firstName: 'Demo', 
                lastName: 'User',
                name: 'Demo User',
                institution: 'Virtual Lab University',
                programLevel: 'undergraduate',
                fieldOfStudy: 'biomedical-engineering',
                userId: 'demo_user_001',
                registeredAt: new Date().toISOString(),
                isDemo: true
            },
            { 
                email: 'student@university.edu', 
                password: 'Student123!', 
                firstName: 'Student', 
                lastName: 'Demo',
                name: 'Student Demo',
                institution: 'Demo University',
                programLevel: 'graduate',
                fieldOfStudy: 'biomedical-engineering',
                userId: 'demo_user_002',
                registeredAt: new Date().toISOString(),
                isDemo: true
            }
        ];
        
        return demoAccounts.find(u => u.email === email && u.password === password);
    }

    async function createUserSession(email, rememberMe, userData = null, sessionToken = null) {
        const token = sessionToken || localStorage.getItem('lab_auth_token') || generateAuthToken();
        
        // Use provided userData or get it from storage/demo accounts
        let user = userData;
        if (!user) {
            // Try to find user in registered users
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            user = registeredUsers.find(u => u.email === email);
            
            // If not found, try demo accounts
            if (!user) {
                const demoAccounts = [
                    { 
                        email: 'demo@lab.edu', 
                        firstName: 'Demo', 
                        lastName: 'User',
                        name: 'Demo User',
                        institution: 'Virtual Lab University',
                        programLevel: 'undergraduate',
                        fieldOfStudy: 'biomedical-engineering',
                        userId: 'demo_user_001',
                        registeredAt: new Date().toISOString(),
                        isDemo: true
                    },
                    { 
                        email: 'student@university.edu', 
                        firstName: 'Student', 
                        lastName: 'Demo',
                        name: 'Student Demo',
                        institution: 'Demo University',
                        programLevel: 'graduate',
                        fieldOfStudy: 'biomedical-engineering',
                        userId: 'demo_user_002',
                        registeredAt: new Date().toISOString(),
                        isDemo: true
                    }
                ];
                user = demoAccounts.find(u => u.email === email);
            }
        }
        
        if (!user) {
            throw new Error('User not found');
        }

        // Normalize user shape across backend, Supabase, and local fallback payloads.
        user = {
            ...user,
            firstName: user.firstName || user.first_name || '',
            lastName: user.lastName || user.last_name || '',
            first_name: user.first_name || user.firstName || '',
            last_name: user.last_name || user.lastName || '',
            role: user.role || 'student',
            name: user.name || `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim()
        };
        
        // Store authentication
        localStorage.setItem('authToken', token);
        if (sessionToken) {
            localStorage.setItem('lab_auth_token', sessionToken);
        }
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Console logging for verification
        console.log('✅ User session created successfully!');
        console.log('👤 Logged in as:', user.name || user.email);
        console.log('🔑 Auth token stored:', token.substring(0, 15) + '...');
        console.log('💾 User data retrieved from storage');
        
        if (rememberMe) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            localStorage.setItem('authExpiry', expiryDate.toISOString());
            console.log('⏰ Session will expire:', expiryDate.toLocaleString());
        }
        
        // Store login session info
        const sessionInfo = {
            loginTime: new Date().toISOString(),
            email: user.email,
            userId: user.userId,
            rememberMe: rememberMe
        };
        localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
        
        return user;
    }

    // =========================================
    // DATA STORAGE CONFIRMATION
    // =========================================

    function showDataStorageConfirmation(userData, storageType = 'local') {
        const storageConfig = {
            database: {
                icon: 'fas fa-database',
                title: 'Database Storage Confirmed',
                message: 'Successfully stored in backend database for ML processing!',
                color: '#28a745',
                details: [
                    '🗄️ Stored in PostgreSQL database',
                    '🤖 Ready for ML analysis',
                    '🧠 Available for neuro-symbolic processing',
                    '🔄 Synced across devices'
                ]
            },
            local: {
                icon: 'fas fa-save',
                title: 'Account Created Successfully',
                message: 'Your data has been securely stored locally',
                color: '#007bff',
                details: [
                    '💾 Stored in browser localStorage',
                    '🔒 Data remains on your device',
                    '⚡ Fast local access',
                    '🔄 Will sync when database available'
                ]
            }
        };
        
        const config = storageConfig[storageType];
        
        // Create confirmation notification
        const notification = document.createElement('div');
        notification.className = 'data-storage-notification';
        notification.innerHTML = `
            <div class="notification-content" style="border-left: 4px solid ${config.color}">
                <div class="notification-header">
                    <i class="${config.icon}" style="color: ${config.color}"></i>
                    <h4>${config.title}</h4>
                </div>
                <div class="notification-body">
                    <p><strong>${config.message}</strong></p>
                    <div class="user-summary">
                        <p><i class="fas fa-user"></i> <strong>${userData.first_name || userData.firstName} ${userData.last_name || userData.lastName}</strong></p>
                        <p><i class="fas fa-envelope"></i> ${userData.email}</p>
                        <p><i class="fas fa-university"></i> ${userData.institution || 'Not specified'}</p>
                        ${userData.id ? `<p><i class="fas fa-id-card"></i> Database ID: ${userData.id}</p>` : ''}
                    </div>
                    <div class="storage-details">
                        ${config.details.map(detail => `<small>• ${detail}</small>`).join('<br>')}
                    </div>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add notification styles if not already added
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .data-storage-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(39, 174, 96, 0.3);
                    z-index: 10000;
                    max-width: 400px;
                    animation: notificationSlideIn 0.5s ease;
                }
                
                .notification-content {
                    position: relative;
                }
                
                .notification-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                
                .notification-header i {
                    font-size: 1.5rem;
                }
                
                .notification-header h4 {
                    margin: 0;
                    font-size: 1.1rem;
                }
                
                .notification-body ul {
                    margin: 12px 0;
                    padding-left: 0;
                    list-style: none;
                }
                
                .notification-body li {
                    margin: 8px 0;
                    font-size: 0.9rem;
                }
                
                .notification-body small {
                    opacity: 0.9;
                    font-style: italic;
                }
                
                .notification-close {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s ease;
                }
                
                .notification-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                @keyframes notificationSlideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'notificationSlideIn 0.5s ease reverse';
                setTimeout(() => notification.remove(), 500);
            }
        }, 8000);
    }

    // Create local backup of user data
    function createLocalUserBackup(userData) {
        try {
            console.log('💾 Creating local backup for user:', userData.email);
            
            // Get existing users
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            
            // Create backup user object with consistent field names
            const backupUser = {
                ...userData,
                // Ensure consistent field names for backward compatibility
                firstName: userData.first_name || userData.firstName,
                lastName: userData.last_name || userData.lastName,
                name: (userData.first_name || userData.firstName) + ' ' + (userData.last_name || userData.lastName),
                learningGoals: userData.learning_goals || userData.learningGoals || [],
                fieldOfStudy: userData.field_of_study || userData.fieldOfStudy,
                programLevel: userData.program_level || userData.programLevel,
                labExperience: userData.lab_experience || userData.labExperience,
                learningPace: userData.learning_pace || userData.learningPace,
                
                // Add backup metadata
                backupCreatedAt: new Date().toISOString(),
                originalSource: 'database',
                databaseId: userData.id,
                localBackup: true,
                
                // Ensure required fields exist
                registeredAt: userData.created_at || userData.registeredAt || new Date().toISOString(),
                userId: userData.id ? `db_${userData.id}` : `local_${Date.now()}`
            };
            
            // Remove any existing backup for this email
            const filteredUsers = existingUsers.filter(u => u.email !== userData.email);
            
            // Add new backup
            filteredUsers.push(backupUser);
            
            // Save to localStorage
            localStorage.setItem('registeredUsers', JSON.stringify(filteredUsers));
            localStorage.setItem('totalRegisteredUsers', filteredUsers.length.toString());
            
            // Also set as current user for immediate access
            localStorage.setItem('currentUser', JSON.stringify(backupUser));
            
            console.log('✅ Local backup created successfully');
            console.log('📊 Total local users:', filteredUsers.length);
            
            return backupUser;
            
        } catch (error) {
            console.error('❌ Failed to create local backup:', error);
            return null;
        }
    }

    // =========================================
    // REGISTRATION PAGE
    // =========================================

    function initRegisterPage() {
        elements = {
            registerForm: document.getElementById('register-form'),
            steps: document.querySelectorAll('.step'),
            formSteps: document.querySelectorAll('.form-step'),
            
            // Step 1 elements
            firstName: document.getElementById('first-name'),
            lastName: document.getElementById('last-name'),
            emailRegister: document.getElementById('email-register'),
            passwordRegister: document.getElementById('password-register'),
            confirmPassword: document.getElementById('confirm-password'),
            
            // Step 2 elements
            institution: document.getElementById('institution'),
            programLevel: document.getElementById('program-level'),
            yearOfStudy: document.getElementById('year-of-study'),
            fieldOfStudy: document.getElementById('field-of-study'),
            labExperience: document.getElementById('lab-experience'),
            
            // Step 3 elements
            learningGoals: document.querySelectorAll('input[name="learningGoals"]'),
            interests: document.querySelectorAll('input[name="interests"]'),
            learningPace: document.getElementById('learning-pace'),
            termsAgreement: document.getElementById('terms-agreement'),
            notifications: document.getElementById('notifications'),
            
            registerBtn: document.getElementById('register-btn'),
            loadingScreen: document.getElementById('loading-screen')
        };

        if (elements.registerForm) {
            elements.registerForm.addEventListener('submit', handleRegistration);
        }

        // Password strength checking
        if (elements.passwordRegister) {
            elements.passwordRegister.addEventListener('input', checkPasswordStrength);
        }

        // Confirm password validation
        if (elements.confirmPassword) {
            elements.confirmPassword.addEventListener('input', validatePasswordMatch);
        }

        // Interest limiting (max 3)
        if (elements.interests) {
            elements.interests.forEach(checkbox => {
                checkbox.addEventListener('change', limitInterests);
            });
        }

        // Real-time validation for all steps
        setupRealTimeValidation();
    }

    function setupRealTimeValidation() {
        // Step 1 validation
        if (elements.firstName) elements.firstName.addEventListener('blur', () => validateField('firstName'));
        if (elements.lastName) elements.lastName.addEventListener('blur', () => validateField('lastName'));
        if (elements.emailRegister) elements.emailRegister.addEventListener('blur', () => validateField('email'));
        if (elements.passwordRegister) elements.passwordRegister.addEventListener('blur', () => validateField('password'));

        // Step 2 validation
        if (elements.institution) elements.institution.addEventListener('blur', () => validateField('institution'));
        if (elements.programLevel) elements.programLevel.addEventListener('change', () => validateField('programLevel'));
        if (elements.fieldOfStudy) elements.fieldOfStudy.addEventListener('change', () => validateField('fieldOfStudy'));
        if (elements.labExperience) elements.labExperience.addEventListener('change', () => validateField('labExperience'));

        // Step 3 validation
        if (elements.learningPace) elements.learningPace.addEventListener('change', () => validateField('learningPace'));
        if (elements.termsAgreement) elements.termsAgreement.addEventListener('change', () => validateField('terms'));
    }

    async function handleRegistration(e) {
        e.preventDefault();
        
        if (state.isSubmitting) return;
        
        // Validate all steps
        if (!validateAllSteps()) {
            return;
        }

        state.isSubmitting = true;
        updateRegisterButton(true);

        try {
            // Collect all form data
            const userData = collectFormData();

            // Primary registration path: Supabase Auth
            if (getSupabaseClient()) {
                try {
                    const supabaseData = await registerWithSupabase(userData);
                    const mappedUser = mapSupabaseUserToLocalUser(supabaseData.user, userData.email) || userData;

                    if (supabaseData.session) {
                        persistSupabaseSession(supabaseData);
                        createLocalUserBackup(mappedUser);

                        showDataStorageConfirmation(mappedUser, 'database');
                        showLoadingScreen('Creating account...', 'Registration successful! Your account is stored in Supabase...');

                        setTimeout(() => {
                            window.location.href = getPostLoginPath(mappedUser);
                        }, 2000);
                    } else {
                        showLoadingScreen('Account created', 'Please verify your email, then sign in to continue.');

                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2500);
                    }

                    return;
                } catch (supabaseError) {
                    // If Supabase is reachable but rejected the request, don't create conflicting local accounts.
                    supabaseError.preventLocalFallback = true;
                    throw supabaseError;
                }
            }
            
            console.log('📝 Starting registration with backend database...');
            
            // Map form data to API format
            const apiUserData = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                password: userData.password,
                institution: userData.institution || null,
                programLevel: userData.programLevel || null,
                fieldOfStudy: userData.fieldOfStudy || null,
                labExperience: userData.labExperience || null,
                learningGoals: userData.learningGoals || [],
                interests: userData.interests || [],
                learningPace: userData.learningPace || null,
                notifications: userData.notifications !== false
            };
            
            // Check if backend is available and register
            const backendHealthy = await window.labAPI.healthCheck();
            
            if (backendHealthy) {
                console.log('🌐 Backend available - submitting to database...');
                
                try {
                    const response = await window.labAPI.register(apiUserData);
                    
                    console.log('✅ Successfully registered in database!');
                    console.log('👤 User ID:', response.user.id);
                    console.log('🔑 Authentication token received');
                    
                    // Track successful registration
                    window.labAPI.trackFormSubmission(
                        document.querySelector('#registration-form, form'), 
                        true, 
                        []
                    );
                    
                    // Show success confirmation
                    showDataStorageConfirmation(response.user, 'database');
                    
                    // Also create local backup
                    createLocalUserBackup(response.user);
                    
                    showLoadingScreen('Creating account...', 'Successfully registered! Your data is now stored in the database for ML processing...');
                    
                    setTimeout(() => {
                        window.location.href = getPostLoginPath(response.user);
                    }, 2500);
                    
                } catch (apiError) {
                    console.error('❌ Database registration failed:', apiError);
                    throw new Error(`Database registration failed: ${apiError.message}`);
                }
                
            } else {
                console.warn('⚠️ Backend unavailable - using local storage fallback');
                throw new Error('Backend database unavailable - falling back to local storage');
            }

        } catch (error) {
            console.error('❌ Registration error:', error);

            if (error?.preventLocalFallback) {
                showErrorModal('Registration Failed', error.message || 'Supabase registration failed');
                return;
            }
            
            // Fallback to local storage
            try {
                console.log('📦 Attempting local storage fallback...');
                
                const userData = collectFormData();
                
                // Check if email already exists locally
                if (await emailExists(userData.email)) {
                    throw new Error('An account with this email already exists');
                }

                // Create local account
                await createUserAccount(userData);
                
                console.log('✅ Local account created successfully');
                showDataStorageConfirmation(userData, 'local');
                
                showLoadingScreen('Creating account...', 'Account created locally. Note: Data will not be available for ML processing until backend is restored.');
                
                setTimeout(() => {
                    // Auto-login after local registration
                    createUserSession(userData.email, false, userData).then(() => {
                        window.location.href = getPostLoginPath(userData);
                    }).catch(loginError => {
                        console.error('Auto-login failed:', loginError);
                        showErrorModal('Login Error', 'Account created successfully but auto-login failed. Please sign in manually.');
                        window.location.href = 'login.html';
                    });
                }, 2500);
                
            } catch (fallbackError) {
                console.error('❌ Local fallback also failed:', fallbackError);
                showErrorModal('Registration Failed', `Registration failed: ${fallbackError.message}`);
            }
            
        } finally {
            state.isSubmitting = false;
            updateRegisterButton(false);
        }
    }

    function collectFormData() {
        const formData = {
            // Personal Information
            firstName: elements.firstName.value.trim(),
            lastName: elements.lastName.value.trim(),
            email: elements.emailRegister.value.trim(),
            password: elements.passwordRegister.value,
            
            // Academic Information
            institution: elements.institution.value.trim(),
            programLevel: elements.programLevel.value,
            yearOfStudy: elements.yearOfStudy.value,
            fieldOfStudy: elements.fieldOfStudy.value,
            labExperience: elements.labExperience.value,
            
            // Learning Preferences
            learningGoals: Array.from(elements.learningGoals)
                .filter(cb => cb.checked)
                .map(cb => cb.value),
            interests: Array.from(elements.interests)
                .filter(cb => cb.checked)
                .map(cb => cb.value),
            learningPace: elements.learningPace.value,
            notifications: elements.notifications.checked,
            
            // Metadata
            registeredAt: new Date().toISOString(),
            userId: generateUserId()
        };

        return formData;
    }

    async function emailExists(email) {
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        return registeredUsers.some(user => user.email === email);
    }

    async function createUserAccount(userData) {
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        
        // Add display name for easier identification
        userData.name = userData.firstName + ' ' + userData.lastName;
        
        // Add creation timestamp
        userData.createdAt = new Date().toISOString();
        
        registeredUsers.push(userData);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        
        // Store user count for statistics
        localStorage.setItem('totalRegisteredUsers', registeredUsers.length.toString());
        
        // Also set as current user
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Console logging for verification
        console.log('✅ User account created and stored successfully!');
        console.log('📧 Email:', userData.email);
        console.log('👤 Name:', userData.name);
        console.log('🏫 Institution:', userData.institution);
        console.log('📚 Field:', userData.fieldOfStudy);
        console.log('🎯 Learning Goals:', userData.learningGoals);
        console.log('❤️ Interests:', userData.interests);
        console.log('💾 Total registered users:', registeredUsers.length);
        
        // Show confirmation to user
        showDataStorageConfirmation(userData);
        
        return userData;
    }

    // =========================================
    // STEP NAVIGATION (REGISTRATION)
    // =========================================

    window.nextStep = function() {
        const isValid = validateCurrentStep();
        if (!isValid) {
            focusFirstInvalidField(state.currentStep);
            return;
        }

        if (state.currentStep < state.maxStep) {
            state.currentStep++;
            updateStepDisplay();
        }
    };

    window.prevStep = function() {
        if (state.currentStep > 1) {
            state.currentStep--;
            updateStepDisplay();
        }
    };

    function updateStepDisplay() {
        // Update step indicators
        elements.steps.forEach((step, index) => {
            const stepNumber = index + 1;
            
            step.classList.remove('active', 'completed');
            
            if (stepNumber < state.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === state.currentStep) {
                step.classList.add('active');
            }
        });

        // Show/hide form steps
        elements.formSteps.forEach((formStep, index) => {
            const stepNumber = index + 1;
            
            formStep.classList.remove('active');
            
            if (stepNumber === state.currentStep) {
                formStep.classList.add('active');
            }
        });

        // Smooth scroll to top of form
        elements.registerForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function validateCurrentStep() {
        switch (state.currentStep) {
            case 1:
                return validateStep1();
            case 2:
                return validateStep2();
            case 3:
                return validateStep3();
            default:
                return false;
        }
    }

    function focusFirstInvalidField(stepNumber) {
        const fieldsByStep = {
            1: [elements.firstName, elements.lastName, elements.emailRegister, elements.passwordRegister, elements.confirmPassword],
            2: [elements.institution, elements.programLevel, elements.fieldOfStudy, elements.labExperience],
            3: [elements.learningPace, elements.termsAgreement]
        };

        const candidates = fieldsByStep[stepNumber] || [];
        const target = candidates.find((field) => field && field.classList && field.classList.contains('error'));

        if (target && typeof target.focus === 'function') {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function validateStep1() {
        const validations = [
            validateField('firstName'),
            validateField('lastName'),
            validateField('email'),
            validateField('password'),
            validatePasswordMatch()
        ];

        return validations.every(v => v);
    }

    function validateStep2() {
        const validations = [
            validateField('institution'),
            validateField('programLevel'),
            validateField('fieldOfStudy'),
            validateField('labExperience')
        ];

        return validations.every(v => v);
    }

    function validateStep3() {
        const validations = [
            validateField('learningPace'),
            validateField('terms')
        ];

        return validations.every(v => v);
    }

    function validateAllSteps() {
        return validateStep1() && validateStep2() && validateStep3();
    }

    // =========================================
    // VALIDATION FUNCTIONS
    // =========================================

    function validateEmail() {
        const email = elements.email ? elements.email.value.trim() : elements.emailRegister.value.trim();
        const field = elements.email || elements.emailRegister;
        
        if (!email) {
            showFieldError(field, 'Email is required');
            return false;
        }

        if (!state.validationRules.email.test(email)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }

        clearFieldError(field);
        return true;
    }

    function validatePassword() {
        const password = elements.password ? elements.password.value : elements.passwordRegister.value;
        const field = elements.password || elements.passwordRegister;
        
        if (!password) {
            showFieldError(field, 'Password is required');
            return false;
        }

        if (password.length < 8) {
            showFieldError(field, 'Password must be at least 8 characters');
            return false;
        }

        if (!state.validationRules.password.test(password)) {
            showFieldError(field, 'Password must contain uppercase, lowercase, and number');
            return false;
        }

        clearFieldError(field);
        return true;
    }

    function validatePasswordMatch() {
        if (!elements.confirmPassword) return true;
        
        const password = elements.passwordRegister.value;
        const confirmPassword = elements.confirmPassword.value;
        
        if (confirmPassword && password !== confirmPassword) {
            showFieldError(elements.confirmPassword, 'Passwords do not match');
            return false;
        }

        clearFieldError(elements.confirmPassword);
        return true;
    }

    function validateField(fieldName) {
        switch (fieldName) {
            case 'firstName':
                return validateRequired(elements.firstName, 'First name is required');
            case 'lastName':
                return validateRequired(elements.lastName, 'Last name is required');
            case 'email':
                return validateEmail();
            case 'password':
                return validatePassword();
            case 'institution':
                return validateRequired(elements.institution, 'Institution is required');
            case 'programLevel':
                return validateRequired(elements.programLevel, 'Program level is required');
            case 'fieldOfStudy':
                return validateRequired(elements.fieldOfStudy, 'Field of study is required');
            case 'labExperience':
                return validateRequired(elements.labExperience, 'Lab experience is required');
            case 'learningPace':
                return validateRequired(elements.learningPace, 'Learning pace is required');
            case 'terms':
                return validateTerms();
            default:
                return true;
        }
    }

    function validateRequired(field, message) {
        if (!field) return true;
        
        const value = field.value.trim();
        
        if (!value) {
            showFieldError(field, message);
            return false;
        }

        clearFieldError(field);
        return true;
    }

    function validateTerms() {
        if (!elements.termsAgreement) return true;
        
        if (!elements.termsAgreement.checked) {
            showFieldError(elements.termsAgreement, 'You must agree to the terms');
            return false;
        }

        clearFieldError(elements.termsAgreement);
        return true;
    }

    function showFieldError(field, message) {
        if (!field) return;
        
        field.classList.add('error');
        
        const errorElement = getErrorElementForField(field);
        
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function clearFieldError(field) {
        if (!field) return;
        
        field.classList.remove('error');
        
        const errorElement = getErrorElementForField(field);
        
        if (errorElement) {
            errorElement.textContent = '';
        }
    }

    function getErrorElementForField(field) {
        if (!field || !field.id) return null;

        // Terms checkbox uses a non-standard error element id in register.html
        if (field.id === 'terms-agreement') {
            return document.getElementById('terms-error');
        }

        const exactMatch = document.getElementById(field.id + '-error');
        if (exactMatch) return exactMatch;

        // Fallback for dashed IDs where a legacy alias might exist.
        const alias = field.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        return document.getElementById(alias + '-error');
    }

    function clearError(e) {
        clearFieldError(e.target);
    }

    // =========================================
    // PASSWORD UTILITIES
    // =========================================

    window.togglePassword = function(fieldId) {
        const field = document.getElementById(fieldId);
        const icon = document.getElementById(fieldId + '-toggle-icon');
        
        if (!field || !icon) return;
        
        if (field.type === 'password') {
            field.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            field.type = 'password';
            icon.className = 'fas fa-eye';
        }
    };

    function checkPasswordStrength() {
        const password = elements.passwordRegister.value;
        const strengthElement = document.getElementById('password-strength');
        
        if (!strengthElement) return;
        
        let strength = 0;
        let strengthText = '';
        let strengthClass = '';
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[@$!%*?&]/.test(password)) strength++;
        
        if (strength < 3) {
            strengthText = 'Weak';
            strengthClass = 'strength-weak';
        } else if (strength < 4) {
            strengthText = 'Medium';
            strengthClass = 'strength-medium';
        } else {
            strengthText = 'Strong';
            strengthClass = 'strength-strong';
        }
        
        strengthElement.innerHTML = `
            <span>${strengthText}</span>
            <div class="strength-bar ${strengthClass}">
                <div class="strength-fill"></div>
            </div>
        `;
    }

    // =========================================
    // INTEREST LIMITING
    // =========================================

    function limitInterests() {
        const checkedInterests = Array.from(elements.interests).filter(cb => cb.checked);
        
        if (checkedInterests.length >= 3) {
            // Disable unchecked checkboxes
            elements.interests.forEach(cb => {
                if (!cb.checked) {
                    cb.disabled = true;
                }
            });
        } else {
            // Enable all checkboxes
            elements.interests.forEach(cb => {
                cb.disabled = false;
            });
        }
    }

    // =========================================
    // UI HELPERS
    // =========================================

    function updateLoginButton(loading) {
        if (!elements.loginBtn) return;
        
        if (loading) {
            elements.loginBtn.disabled = true;
            elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
        } else {
            elements.loginBtn.disabled = false;
            elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to Laboratory';
        }
    }

    function updateRegisterButton(loading) {
        if (!elements.registerBtn) return;
        
        if (loading) {
            elements.registerBtn.disabled = true;
            elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        } else {
            elements.registerBtn.disabled = false;
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Laboratory Account';
        }
    }

    function showLoadingScreen(title, message) {
        const loadingScreen = elements.loadingScreen;
        if (!loadingScreen) return;
        
        const titleElement = loadingScreen.querySelector('h1');
        const messageElement = loadingScreen.querySelector('p');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        loadingScreen.classList.remove('hidden');
    }

    function showErrorModal(title, message) {
        const modal = elements.errorModal || document.getElementById('error-modal');
        if (!modal) {
            alert(title + ': ' + message);
            return;
        }
        
        const titleElement = modal.querySelector('h3');
        const messageElement = modal.querySelector('#error-message');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        modal.classList.remove('hidden');
    }

    window.closeErrorModal = function() {
        const modal = document.getElementById('error-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.retryLogin = function() {
        closeErrorModal();
        // Clear form and focus first field
        if (elements.email) elements.email.focus();
    };

    // =========================================
    // DEMO FUNCTIONS
    // =========================================
    
    // Simple demo login test function
    window.testDemoLogin = function() {
        console.log('🔬 Testing demo login directly...');
        
        // Try to find elements directly
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginForm = document.getElementById('login-form');
        
        console.log('Elements check:', {
            email: !!emailInput,
            password: !!passwordInput,
            form: !!loginForm,
            labAPI: typeof window.labAPI
        });
        
        if (!emailInput || !passwordInput || !loginForm) {
            console.error('❌ Required elements not found');
            alert('Demo login failed - required form elements not found');
            return;
        }
        
        // Fill in demo credentials
        emailInput.value = 'demo@lab.edu';
        passwordInput.value = 'Demo123!';
        
        console.log('✅ Credentials filled, attempting validation...');
        
        // Test credential validation directly
        validateCredentials('demo@lab.edu', 'Demo123!')
            .then(user => {
                if (user) {
                    console.log('✅ Validation successful:', user);
                    alert(`Demo validation works! Found user: ${user.firstName} ${user.lastName}`);
                    
                    // Try to complete the login process
                    createUserSession('demo@lab.edu', false, user)
                        .then(sessionData => {
                            console.log('✅ Session created:', sessionData);
                            alert('Login successful! Redirecting to lab...');
                            setTimeout(() => window.location.href = 'index.html', 1000);
                        })
                        .catch(error => {
                            console.error('❌ Session creation failed:', error);
                            alert('Session creation failed: ' + error.message);
                        });
                } else {
                    console.error('❌ No user found for demo credentials');
                    alert('Demo validation failed: User not found');
                }
            })
            .catch(error => {
                console.error('❌ Validation failed:', error);
                alert('Demo validation failed: ' + error.message);
            });
    };

    window.demoLogin = async function() {
        console.log('🔬 Demo login clicked');
        
        try {
            // Wait a bit to ensure elements are available
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('📧 Elements found:', {
                email: !!elements.email,
                password: !!elements.password,
                loginForm: !!elements.loginForm
            });
            
            if (!elements.email || !elements.password || !elements.loginForm) {
                console.warn('⚠️ Elements not initialized, trying direct access...');
                
                // Try direct element access
                const emailEl = document.getElementById('email');
                const passwordEl = document.getElementById('password');
                
                if (emailEl && passwordEl) {
                    emailEl.value = 'demo@lab.edu';
                    passwordEl.value = 'Demo123!';
                    console.log('✅ Direct element access successful');
                    
                    // Try direct form submission
                    const form = document.getElementById('login-form');
                    if (form) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        form.dispatchEvent(submitEvent);
                        return;
                    }
                }
                
                alert('Demo login elements not ready. Please try the "Test Demo Login" button in the debug panel.');
                return;
            }
            
            if (elements.email) elements.email.value = 'demo@lab.edu';
            if (elements.password) elements.password.value = 'Demo123!';
            
            // Clear any existing errors
            clearAllErrors();
            
            console.log('🚀 Triggering login form submission...');
            
            // Trigger login
            if (elements.loginForm) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                elements.loginForm.dispatchEvent(submitEvent);
            } else {
                console.error('❌ Login form not found!');
                alert('Login form not found. Please refresh the page and try again.');
            }
        } catch (error) {
            console.error('❌ Demo login error:', error);
            alert('Demo login failed: ' + error.message);
        }
    };
    
    function clearAllErrors() {
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
        
        const inputElements = document.querySelectorAll('.form-group input');
        inputElements.forEach(input => {
            input.classList.remove('error');
        });
    }

    window.showForgotPassword = function() {
        alert('Password reset functionality would be implemented here.\n\nFor demo purposes, try:\nEmail: demo@lab.edu\nPassword: Demo123!');
    };

    window.showHelp = function() {
        alert('Help documentation would be available here.\n\nFor support, contact: support@virtuallab.edu');
    };

    window.showAbout = function() {
        alert('Virtual Laboratory Hub v2.0\n\nAdvanced biomedical engineering education platform with immersive virtual experiments.');
    };

    window.showTerms = function() {
        alert('Terms of Service would be displayed here in a modal or separate page.');
    };

    window.showPrivacy = function() {
        alert('Privacy Policy would be displayed here in a modal or separate page.');
    };

    // =========================================
    // DEBUG AND UTILITY FUNCTIONS
    // =========================================
    
    // Add global functions to help debug authentication
    window.debugAuth = function() {
        const currentUser = getUserData();
        const authToken = localStorage.getItem('authToken');
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const sessionInfo = JSON.parse(localStorage.getItem('sessionInfo') || '{}');
        
        console.log('=== Authentication Debug ===');
        console.log('Current User:', currentUser);
        console.log('Auth Token:', authToken);
        console.log('Total Registered Users:', registeredUsers.length);
        console.log('Registered Users:', registeredUsers);
        console.log('Session Info:', sessionInfo);
        console.log('=== End Debug ===');
        
        return {
            currentUser,
            authToken,
            registeredUsers,
            sessionInfo
        };
    };
    
    window.clearAllUserData = function() {
        if (confirm('This will delete all user accounts and session data. Continue?')) {
            localStorage.removeItem('registeredUsers');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            localStorage.removeItem('sessionInfo');
            localStorage.removeItem('authExpiry');
            localStorage.removeItem('totalRegisteredUsers');
            console.log('All user data cleared');
            alert('All user data has been cleared. You can now test registration from scratch.');
        }
    };
    
    window.listAllUsers = function() {
        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        console.log('=== All Registered Users ===');
        registeredUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.institution}`);
        });
        console.log('Demo accounts also available: demo@lab.edu, student@university.edu');
        return registeredUsers;
    };
    
    function updateDebugInfo() {
        const registeredUsersElement = document.getElementById('registered-users-count');
        if (registeredUsersElement) {
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            registeredUsersElement.innerHTML = `<br>• ${registeredUsers.length} registered user(s) in storage`;
        }
    }
    
    window.toggleDebugPanel = function() {
        const content = document.getElementById('debug-content');
        const icon = document.getElementById('debug-toggle-icon');
        
        if (content && icon) {
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.className = 'fas fa-chevron-up';
                updateDebugInfo();
            } else {
                content.style.display = 'none';
                icon.className = 'fas fa-chevron-down';
            }
        }
    };

    function simulateAuthRequest() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000 + Math.random() * 1000);
        });
    }

    function generateAuthToken() {
        return 'auth_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    function generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    function getUserData() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    }

    // =========================================
    // ENHANCED DEVELOPER TOOLS
    // =========================================

    // Add enhanced developer tools to window for comprehensive testing
    window.labDev = {
        // View all stored data with detailed information
        viewData: function() {
            console.group('🔍 Virtual Lab - Complete Data Overview');
            
            const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            const authToken = localStorage.getItem('authToken');
            const sessionInfo = JSON.parse(localStorage.getItem('sessionInfo') || 'null');
            
            console.log('📊 Storage Statistics:');
            console.log(`   📝 Registered Users: ${registeredUsers.length}`);
            console.log(`   👤 Active Session: ${currentUser ? '✅ Yes (' + currentUser.name + ')' : '❌ No'}`);
            console.log(`   🔑 Auth Token: ${authToken ? '✅ Present' : '❌ None'}`);
            console.log(`   💾 Total Storage Keys: ${Object.keys(localStorage).length}`);
            
            if (registeredUsers.length > 0) {
                console.log('\n👥 All Registered Users:');
                registeredUsers.forEach((user, index) => {
                    console.log(`   ${index + 1}. 👤 ${user.name}`);
                    console.log(`      📧 ${user.email}`);
                    console.log(`      🏫 ${user.institution || 'N/A'}`);
                    console.log(`      📚 ${user.fieldOfStudy || 'N/A'}`);
                    console.log(`      🎯 Goals: ${(user.learningGoals || []).join(', ') || 'None'}`);
                    console.log(`      ❤️ Interests: ${(user.interests || []).join(', ') || 'None'}`);
                    console.log('');
                });
            }
            
            if (currentUser) {
                console.log('🔒 Current Session Details:');
                console.log(currentUser);
            }
            
            if (sessionInfo) {
                console.log('⏰ Session Information:');
                console.log(sessionInfo);
            }
            
            console.groupEnd();
            
            // Also display in data verification page if open
            this.updateVerificationPage();
            
            return { 
                stats: { 
                    totalUsers: registeredUsers.length, 
                    hasActiveSession: !!currentUser,
                    hasAuthToken: !!authToken 
                },
                users: registeredUsers, 
                currentUser, 
                sessionInfo 
            };
        },
        
        // Create realistic test users for demonstration
        createTestUsers: function(count = 3) {
            const testUsers = [
                {
                    firstName: 'Alice', lastName: 'Johnson',
                    email: 'alice.johnson@university.edu',
                    institution: 'Medical University',
                    programLevel: 'graduate',
                    fieldOfStudy: 'biomedical-engineering',
                    labExperience: 'advanced',
                    learningGoals: ['signal-processing', 'clinical-applications'],
                    interests: ['cardiology', 'imaging'],
                    learningPace: 'structured'
                },
                {
                    firstName: 'Bob', lastName: 'Smith',
                    email: 'bob.smith@college.edu',
                    institution: 'Engineering College',
                    programLevel: 'undergraduate',
                    fieldOfStudy: 'electrical-engineering',
                    labExperience: 'basic',
                    learningGoals: ['data-analysis', 'lab-techniques'],
                    interests: ['neurology', 'rehabilitation'],
                    learningPace: 'self-paced'
                },
                {
                    firstName: 'Dr. Sarah', lastName: 'Wilson',
                    email: 'sarah.wilson@research.org',
                    institution: 'Research Institute',
                    programLevel: 'faculty',
                    fieldOfStudy: 'medicine',
                    labExperience: 'professional',
                    learningGoals: ['research-skills', 'certification-prep'],
                    interests: ['biomechanics', 'prosthetics'],
                    learningPace: 'intensive'
                }
            ];
            
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            let created = 0;
            
            testUsers.slice(0, count).forEach(userData => {
                // Check if user already exists
                if (!users.some(u => u.email === userData.email)) {
                    const completeUser = {
                        ...userData,
                        name: userData.firstName + ' ' + userData.lastName,
                        password: 'Test123!',
                        registeredAt: new Date().toISOString(),
                        userId: 'test_user_' + Date.now() + '_' + created,
                        notifications: true
                    };
                    users.push(completeUser);
                    created++;
                }
            });
            
            if (created > 0) {
                localStorage.setItem('registeredUsers', JSON.stringify(users));
                localStorage.setItem('totalRegisteredUsers', users.length.toString());
                
                console.log(`✅ Created ${created} test user(s)!`);
                console.log('🔍 Use labDev.viewData() to see all users');
                
                // Update verification page if open
                this.updateVerificationPage();
            } else {
                console.log('ℹ️ Test users already exist');
            }
            
            return created;
        },
        
        // Generate comprehensive analytics
        analytics: function() {
            const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            
            if (users.length === 0) {
                console.log('📊 No user data available for analytics');
                return { totalUsers: 0 };
            }
            
            const analytics = {
                totalUsers: users.length,
                registrationTrend: [],
                demographics: {
                    programLevels: {},
                    institutions: {},
                    fieldsOfStudy: {},
                    experienceLevels: {}
                },
                preferences: {
                    learningGoals: {},
                    interests: {},
                    learningPace: {}
                },
                engagement: {
                    averageGoals: 0,
                    averageInterests: 0,
                    notificationsEnabled: 0
                }
            };
            
            let totalGoals = 0, totalInterests = 0;
            
            users.forEach(user => {
                // Demographics
                analytics.demographics.programLevels[user.programLevel] = 
                    (analytics.demographics.programLevels[user.programLevel] || 0) + 1;
                analytics.demographics.institutions[user.institution] = 
                    (analytics.demographics.institutions[user.institution] || 0) + 1;
                analytics.demographics.fieldsOfStudy[user.fieldOfStudy] = 
                    (analytics.demographics.fieldsOfStudy[user.fieldOfStudy] || 0) + 1;
                analytics.demographics.experienceLevels[user.labExperience] = 
                    (analytics.demographics.experienceLevels[user.labExperience] || 0) + 1;
                
                // Preferences
                (user.learningGoals || []).forEach(goal => {
                    analytics.preferences.learningGoals[goal] = 
                        (analytics.preferences.learningGoals[goal] || 0) + 1;
                });
                
                (user.interests || []).forEach(interest => {
                    analytics.preferences.interests[interest] = 
                        (analytics.preferences.interests[interest] || 0) + 1;
                });
                
                analytics.preferences.learningPace[user.learningPace] = 
                    (analytics.preferences.learningPace[user.learningPace] || 0) + 1;
                
                // Engagement metrics
                totalGoals += (user.learningGoals || []).length;
                totalInterests += (user.interests || []).length;
                if (user.notifications) analytics.engagement.notificationsEnabled++;
            });
            
            analytics.engagement.averageGoals = (totalGoals / users.length).toFixed(1);
            analytics.engagement.averageInterests = (totalInterests / users.length).toFixed(1);
            
            console.group('📈 Virtual Lab User Analytics');
            console.log('👥 Total Users:', analytics.totalUsers);
            console.log('🎓 Program Levels:', analytics.demographics.programLevels);
            console.log('🏫 Top Institutions:', analytics.demographics.institutions);
            console.log('📚 Fields of Study:', analytics.demographics.fieldsOfStudy);
            console.log('🎯 Popular Learning Goals:', analytics.preferences.learningGoals);
            console.log('❤️ Popular Interests:', analytics.preferences.interests);
            console.log('⚡ Engagement:');
            console.log(`   Average Goals per User: ${analytics.engagement.averageGoals}`);
            console.log(`   Average Interests per User: ${analytics.engagement.averageInterests}`);
            console.log(`   Notifications Enabled: ${analytics.engagement.notificationsEnabled}/${analytics.totalUsers}`);
            console.groupEnd();
            
            return analytics;
        },
        
        // Update data verification page if it's open
        updateVerificationPage: function() {
            // Try to update verification page in another tab/window
            try {
                const verificationWindows = [];
                // This would work if we had reference to opened windows
                // For now, just refresh the current page's verification if applicable
                if (window.location.pathname.includes('data-verification')) {
                    if (typeof refreshData === 'function') {
                        refreshData();
                    }
                }
            } catch (e) {
                // Ignore errors - verification page might not be open
            }
        },
        
        // Clear all data with confirmation
        clearData: function() {
            const userCount = JSON.parse(localStorage.getItem('registeredUsers') || '[]').length;
            if (confirm(`⚠️ This will delete ALL data including ${userCount} user(s). Are you sure?`)) {
                localStorage.clear();
                console.log('🗑️ All data cleared successfully!');
                this.updateVerificationPage();
                return true;
            }
            return false;
        },
        
        // Export all data
        exportData: function() {
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                try {
                    allData[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    allData[key] = localStorage.getItem(key);
                }
            }
            
            const dataStr = JSON.stringify(allData, null, 2);
            console.log('📤 Exported Data:');
            console.log(dataStr);
            
            // Also try to download as file
            try {
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `virtual-lab-data-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
                console.log('💾 Data exported as file');
            } catch (e) {
                console.log('💾 File export failed, but data is logged above');
            }
            
            return allData;
        }
    };

    // Initialize developer tools
    console.log('\n🛠️ Virtual Lab Enhanced Developer Tools Loaded!');
    console.log('📋 Available Commands:');
    console.log('   • labDev.viewData() - View all stored data');
    console.log('   • labDev.createTestUsers(count) - Create test users');  
    console.log('   • labDev.analytics() - Generate user analytics');
    console.log('   • labDev.exportData() - Export all data');
    console.log('   • labDev.clearData() - Clear all data');
    console.log('💡 Open browser DevTools (F12) to use these commands\n');

    // =========================================
    // INITIALIZATION
    // =========================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();