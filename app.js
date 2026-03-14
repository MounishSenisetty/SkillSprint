/* =========================================
   Virtual Laboratory Hub — Main Application
   ========================================= */

(function() {
    'use strict';

    // Application State
    const state = {
        loading: true,
        currentExperiment: null,
        user: null,
        authenticated: false
    };

    // DOM Elements
    let loadingScreen, app, loadProgress;

    // =========================================
    // INITIALIZATION
    // =========================================

    function init() {
        console.log('🚀 Virtual Lab initializing...');
        
        // Check authentication first
        console.log('🔐 Checking authentication...');
        const authResult = checkAuthentication();
        console.log('🔐 Authentication result:', authResult);
        
        if (!authResult) {
            console.log('❌ Authentication failed, redirecting to login...');
            redirectToLogin();
            return;
        }

        console.log('✅ Authentication successful');
        console.log('👤 Current user:', state.user);

        // Get DOM elements
        console.log('🔍 Getting DOM elements...');
        loadingScreen = document.getElementById('loading-screen');
        app = document.getElementById('app');
        loadProgress = document.getElementById('load-progress');
        
        console.log('📋 DOM elements found:', {
            loadingScreen: !!loadingScreen,
            app: !!app,
            loadProgress: !!loadProgress
        });

        // Load user data
        console.log('👤 Loading user data...');
        loadUserData();

        // Validate JWT with backend when available.
        verifyBackendTokenOnStartup();

        // Start loading sequence
        console.log('⏳ Starting loading sequence...');
        startLoadingSequence();
    }

    // =========================================
    // AUTHENTICATION
    // =========================================

    function checkAuthentication() {
        console.log('🔐 Checking authentication tokens...');
        
        const token = localStorage.getItem('authToken') || localStorage.getItem('lab_auth_token');
        const userData = localStorage.getItem('currentUser') || localStorage.getItem('lab_current_user');
        
        console.log('🔐 Token found:', !!token);
        console.log('🔐 User data found:', !!userData);
        
        if (!token || !userData) {
            console.log('❌ Missing authentication data');
            return false;
        }

        // Check token expiry (but be more lenient)
        const expiry = localStorage.getItem('authExpiry');
        if (expiry && new Date() > new Date(expiry)) {
            console.log('⚠️ Token expired, but continuing...');
            // Don't fail on expiry, just warn
        }

        try {
            state.user = JSON.parse(userData);
            state.authenticated = true;
            console.log('✅ Authentication successful for user:', state.user.firstName);
            return true;
        } catch (error) {
            console.error('❌ Failed to parse user data:', error);
            clearAuthData();
            return false;
        }
    }

    function clearAuthData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authExpiry');
        localStorage.removeItem('lab_auth_token');
        localStorage.removeItem('lab_current_user');
    }

    async function verifyBackendTokenOnStartup() {
        try {
            // Only enforce backend verification when a backend JWT exists.
            const hasBackendToken = !!localStorage.getItem('lab_auth_token');
            if (!hasBackendToken) {
                return;
            }

            if (!window.labAPI || typeof window.labAPI.verifyToken !== 'function') {
                return;
            }

            const verification = await window.labAPI.verifyToken();
            if (!verification || verification.valid !== true) {
                console.warn('⚠️ JWT verification failed. Signing out...');
                clearAuthData();
                redirectToLogin();
            }
        } catch (error) {
            console.warn('⚠️ Token verification error:', error?.message || error);
            clearAuthData();
            redirectToLogin();
        }
    }

    function redirectToLogin() {
        window.location.href = 'login.html';
    }

    function loadUserData() {
        if (state.user) {
            personalizeInterface();
            setupUserNavigation();
        }
    }

    function personalizeInterface() {
        // Update header with user name
        updateHeaderWithUserInfo();
        
        // Personalize experiment recommendations
        personalizeExperiments();
        
        // Show user progress if available
        showUserProgress();
    }

    function updateHeaderWithUserInfo() {
        const headerContent = document.querySelector('.header-content');
        if (!headerContent || !state.user) return;

        // Add user info section
        const userSection = document.createElement('div');
        userSection.className = 'user-section';
        userSection.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <div class="user-name">Welcome, ${state.user.firstName || 'Student'}</div>
                    <div class="user-role">${getUserRoleDisplay()}</div>
                </div>
            </div>
            <div class="user-actions">
                <button class="btn-user-menu" onclick="toggleUserMenu()">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="btn-logout" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;

        headerContent.appendChild(userSection);
    }

    function getUserRoleDisplay() {
        if (!state.user) return 'Student';

        const role = String(state.user.role || '').toLowerCase();
        if (role === 'admin') return 'Administrator';
        if (role === 'teacher') return 'Teacher';
        
        const level = state.user.programLevel;
        const field = state.user.fieldOfStudy;
        
        if (level === 'faculty') return 'Faculty';
        if (level === 'researcher') return 'Researcher';
        if (level === 'doctoral') return 'PhD Student';
        if (level === 'graduate') return 'Graduate Student';
        
        return field ? `${field.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Student` : 'Student';
    }

    function personalizeExperiments() {
        if (!state.user || !state.user.interests) return;

        const experiments = document.querySelectorAll('.experiment-card');
        
        experiments.forEach(card => {
            // Add personalization based on user interests
            if (state.user.interests.includes('cardiology') && card.classList.contains('hrv-card')) {
                addRecommendationBadge(card, 'Recommended for you');
            }
            
            if (state.user.interests.includes('neurology') && card.classList.contains('emg-card')) {
                addRecommendationBadge(card, 'Matches your interests');
            }
        });
    }

    function addRecommendationBadge(card, text) {
        const badge = document.createElement('div');
        badge.className = 'recommendation-badge';
        badge.innerHTML = `<i class="fas fa-star"></i> ${text}`;
        
        const cardHeader = card.querySelector('.card-header');
        if (cardHeader) {
            cardHeader.appendChild(badge);
        }
    }

    function showUserProgress() {
        // Add progress section if user has completed experiments
        const userProgress = getUserProgress();
        if (userProgress && userProgress.completedExperiments.length > 0) {
            addProgressSection(userProgress);
        }
    }

    function getUserProgress() {
        const progressData = localStorage.getItem(`userProgress_${state.user.userId}`);
        return progressData ? JSON.parse(progressData) : {
            completedExperiments: [],
            totalTimeSpent: 0,
            achievements: []
        };
    }

    function addProgressSection(progress) {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;

        const progressSection = document.createElement('div');
        progressSection.className = 'user-progress-section';
        progressSection.innerHTML = `
            <div class="progress-content">
                <h3>Your Progress</h3>
                <div class="progress-stats">
                    <div class="progress-stat">
                        <div class="stat-number">${progress.completedExperiments.length}</div>
                        <div class="stat-label">Experiments Completed</div>
                    </div>
                    <div class="progress-stat">
                        <div class="stat-number">${Math.round(progress.totalTimeSpent / 60)}m</div>
                        <div class="stat-label">Time in Lab</div>
                    </div>
                    <div class="progress-stat">
                        <div class="stat-number">${progress.achievements.length}</div>
                        <div class="stat-label">Achievements</div>
                    </div>
                </div>
            </div>
        `;

        heroSection.appendChild(progressSection);
    }

    function setupUserNavigation() {
        // Add logout functionality and user menu
        window.toggleUserMenu = toggleUserMenu;
        window.handleLogout = handleLogout;
    }

    // =========================================
    // USER MENU FUNCTIONS
    // =========================================

    function toggleUserMenu() {
        // Create and show user menu modal
        showUserMenu();
    }

    function showUserMenu() {
        const modal = createUserMenuModal();
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 10);
    }

    function createUserMenuModal() {
        const modal = document.createElement('div');
        modal.className = 'user-menu-modal hidden';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="closeUserMenu()"></div>
            <div class="user-menu-content">
                <div class="user-menu-header">
                    <h3>Account Settings</h3>
                    <button class="close-btn" onclick="closeUserMenu()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="user-menu-body">
                    <div class="user-profile">
                        <div class="profile-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="profile-info">
                            <h4>${state.user.firstName} ${state.user.lastName}</h4>
                            <p>${state.user.email}</p>
                            <p>${getUserRoleDisplay()} • ${state.user.institution || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="menu-options">
                        <button class="menu-option" onclick="viewProfile()">
                            <i class="fas fa-user"></i>
                            View Full Profile
                        </button>
                        <button class="menu-option" onclick="viewProgress()">
                            <i class="fas fa-chart-line"></i>
                            Learning Progress
                        </button>
                        <button class="menu-option" onclick="viewAchievements()">
                            <i class="fas fa-trophy"></i>
                            Achievements
                        </button>
                        <button class="menu-option" onclick="updatePreferences()">
                            <i class="fas fa-cog"></i>
                            Learning Preferences
                        </button>
                        <button class="menu-option" onclick="viewStoredData()">
                            <i class="fas fa-database"></i>
                            View Stored Data
                        </button>
                        <button class="menu-option danger" onclick="deleteMyAccount()">
                            <i class="fas fa-user-times"></i>
                            Delete My Account
                        </button>
                    </div>
                </div>
                <div class="user-menu-footer">
                    <button class="btn-logout-full" onclick="handleLogout()">
                        <i class="fas fa-sign-out-alt"></i>
                        Sign Out
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    window.closeUserMenu = function() {
        const modal = document.querySelector('.user-menu-modal');
        if (modal) {
            modal.classList.add('hidden');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };

    window.viewProfile = function() {
        alert('Profile management would be implemented here.');
        closeUserMenu();
    };

    window.viewProgress = function() {
        const progress = getUserProgress();
        alert(`Progress Report:
        
Completed Experiments: ${progress.completedExperiments.length}
Total Time: ${Math.round(progress.totalTimeSpent / 60)} minutes
Achievements: ${progress.achievements.length}

Detailed progress tracking would be available here.`);
        closeUserMenu();
    };

    window.viewAchievements = function() {
        alert('Achievement system would display badges and certificates here.');
        closeUserMenu();
    };

    window.updatePreferences = function() {
        alert('Learning preferences update form would be available here.');
        closeUserMenu();
    };

    window.viewStoredData = function() {
        window.open('data-verification.html', '_blank');
        closeUserMenu();
    };

    window.deleteMyAccount = async function() {
        const warningAccepted = confirm('This will permanently delete your account and all associated experiment data. Continue?');
        if (!warningAccepted) return;

        const password = prompt('Enter your account password to confirm deletion (demo users can leave this blank):') || '';

        try {
            if (window.labAPI && window.labAPI.isAuthenticated()) {
                await window.labAPI.deleteAccount(password);
            } else {
                const currentUser = state.user;
                if (currentUser?.email) {
                    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                    const filtered = users.filter((user) => user.email !== currentUser.email);
                    localStorage.setItem('registeredUsers', JSON.stringify(filtered));
                }
            }

            alert('Your account has been deleted successfully.');
            clearAuthData();
            window.location.href = 'login.html';
        } catch (error) {
            const message = error?.message || 'Account deletion failed';
            alert(`Unable to delete account: ${message}`);
        }
    };

    async function handleLogout() {
        if (confirm('Are you sure you want to sign out?')) {
            if (window.supabaseLabClient) {
                try {
                    await window.supabaseLabClient.auth.signOut();
                } catch (signOutError) {
                    console.warn('⚠️ Supabase sign-out failed:', signOutError?.message || signOutError);
                }
            }

            clearAuthData();
            window.location.href = 'login.html';
        }
    }

    // =========================================
    // LOADING SEQUENCE
    // =========================================

    function startLoadingSequence() {
        console.log('⏳ Starting loading sequence...');
        
        let progress = 0;
        const stages = [
            { delay: 200, progress: 25, message: 'Loading experiments...' },
            { delay: 400, progress: 50, message: 'Initializing virtual equipment...' },
            { delay: 600, progress: 75, message: 'Preparing laboratory interface...' },
            { delay: 800, progress: 100, message: 'Ready!' }
        ];

        // Emergency fallback - force show app after 5 seconds if loading doesn't complete
        const emergencyTimeout = setTimeout(() => {
            console.warn('⚠️ Loading timeout reached, forcing app to show...');
            forceShowApp();
        }, 5000);

        function loadStage(index) {
            console.log(`📊 Loading stage ${index + 1}/${stages.length}`);
            
            if (index >= stages.length) {
                clearTimeout(emergencyTimeout);
                console.log('✅ All loading stages completed');
                finishLoading();
                return;
            }

            const stage = stages[index];
            
            setTimeout(() => {
                progress = stage.progress;
                updateLoadProgress(progress);
                console.log(`📈 Progress: ${progress}% - ${stage.message}`);
                
                // Update loading message if element exists
                const messageElement = document.querySelector('#loading-screen p');
                if (messageElement && stage.message) {
                    messageElement.textContent = stage.message;
                }
                
                loadStage(index + 1);
            }, stage.delay);
        }

        loadStage(0);
    }
    
    function forceShowApp() {
        console.log('🚨 Force showing app due to timeout...');
        
        // Hide any loading screens
        const loadingElements = document.querySelectorAll('#loading-screen, .loading-screen');
        loadingElements.forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
        });
        
        // Show main app
        const appElements = document.querySelectorAll('#app, .main-app');
        appElements.forEach(el => {
            el.classList.remove('hidden');
            el.style.display = 'block';
        });
        
        // Try to initialize buttons
        try {
            initializeExperimentButtons();
        } catch (error) {
            console.error('❌ Failed to initialize buttons in fallback:', error);
        }
        
        console.log('✅ App forced to show');
    }

    function updateLoadProgress(percentage) {
        if (loadProgress) {
            loadProgress.style.width = percentage + '%';
        }
    }

    function finishLoading() {
        console.log('🎯 Finishing loading process...');
        
        setTimeout(() => {
            console.log('✨ Hiding loading screen and showing app...');
            
            state.loading = false;
            
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                console.log('✅ Loading screen hidden');
            } else {
                console.warn('⚠️ Loading screen element not found');
            }
            
            if (app) {
                app.classList.remove('hidden');
                console.log('✅ App shown');
                
                // Add entrance animation
                app.style.opacity = '0';
                app.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    app.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    app.style.opacity = '1';
                    app.style.transform = 'translateY(0)';
                    console.log('✅ App animation completed');
                }, 100);
            } else {
                console.error('❌ App element not found');
                // Try to show any hidden app elements
                const allHiddenElements = document.querySelectorAll('.hidden');
                console.log('🔍 Found hidden elements:', allHiddenElements.length);
                allHiddenElements.forEach(el => {
                    if (el.id !== 'loading-screen') {
                        el.classList.remove('hidden');
                        console.log('✅ Showed element:', el.id || el.className);
                    }
                });
            }
            
            // Initialize experiment buttons
            console.log('🎮 Initializing experiment buttons...');
            try {
                initializeExperimentButtons();
                console.log('✅ Experiment buttons initialized');
            } catch (error) {
                console.error('❌ Failed to initialize experiment buttons:', error);
            }
            
        }, 500);
    }

    // =========================================
    // EXPERIMENT NAVIGATION
    // =========================================

    function initializeExperimentButtons() {
        // Add click handlers to experiment buttons
        const hrvButton = document.querySelector('.hrv-btn');
        const emgButton = document.querySelector('.emg-btn');

        if (hrvButton) {
            hrvButton.addEventListener('click', () => openExperiment('hrv'));
        }

        if (emgButton) {
            emgButton.addEventListener('click', () => openExperiment('emg'));
        }

        // Add hover effects
        addCardInteractions();
    }

    function addCardInteractions() {
        const experimentCards = document.querySelectorAll('.experiment-card');
        
        experimentCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    // =========================================
    // EXPERIMENT OPENING
    // =========================================

    window.openExperiment = function(experimentType) {
        const button = document.querySelector(`.${experimentType}-btn`);
        
        // Add loading state to button
        if (button) {
            button.disabled = true;
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening...';
            
            // Restore button after delay (in case navigation fails)
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = originalContent;
            }, 3000);
        }

        // Navigate to experiment
        try {
            switch(experimentType.toLowerCase()) {
                case 'hrv':
                    window.location.href = './HRV/index.html';
                    break;
                case 'emg':
                    window.location.href = './EMG/index.html';
                    break;
                default:
                    console.error('Unknown experiment type:', experimentType);
                    showErrorMessage('Experiment not found');
            }
        } catch (error) {
            console.error('Error opening experiment:', error);
            showErrorMessage('Failed to open experiment');
        }
    };

    // =========================================
    // ERROR HANDLING
    // =========================================

    function showErrorMessage(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add error styles if not already added
        if (!document.getElementById('error-styles')) {
            const style = document.createElement('style');
            style.id = 'error-styles';
            style.textContent = `
                .error-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #e74c3c;
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                }
                
                .error-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .error-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                }
                
                @keyframes slideIn {
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
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // =========================================
    // UTILITY FUNCTIONS
    // =========================================

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================

    // Window resize handler
    window.addEventListener('resize', function() {
        // Handle responsive layout changes if needed
        if (isMobile()) {
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (state.loading) return;
        
        switch(e.key) {
            case '1':
                openExperiment('hrv');
                break;
            case '2':
                openExperiment('emg');
                break;
            case 'Escape':
                // Could be used for closing modals or returning to home
                break;
        }
    });

    // =========================================
    // DEBUG AND EMERGENCY FUNCTIONS
    // =========================================
    
    // Emergency debug function - users can call this from console
    window.debugLab = function() {
        console.log('🔧 Lab Debug Information:');
        console.log('   State:', state);
        console.log('   Loading screen element:', document.getElementById('loading-screen'));
        console.log('   App element:', document.getElementById('app'));
        console.log('   Auth token:', !!localStorage.getItem('authToken'));
        console.log('   User data:', !!localStorage.getItem('currentUser'));
        
        // Show what's currently visible
        console.log('   Currently visible elements:');
        document.querySelectorAll('body > *').forEach(el => {
            if (el.style.display !== 'none' && !el.classList.contains('hidden')) {
                console.log('     -', el.tagName, el.id || el.className);
            }
        });
        
        return {
            forceShow: () => forceShowApp(),
            reload: () => window.location.reload(),
            clearAuth: () => {
                localStorage.clear();
                window.location.reload();
            }
        };
    };

    // =========================================
    // STARTUP
    // =========================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();