/**
 * Lab Experiments API Client
 * Handles communication with FastAPI backend for data persistence
 * Designed for ML and Neuro-Symbolic processing data collection
 */

function resolveLabApiBaseUrl() {
    const configuredBaseUrl =
        window.LAB_API_BASE_URL ||
        document.querySelector('meta[name="lab-api-base-url"]')?.content ||
        '';

    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '');
    }

    const { protocol, hostname, origin } = window.location;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (protocol === 'file:') {
        return 'http://localhost:8001/api/v1';
    }

    if (isLocalHost) {
        return `${protocol}//${hostname}:8001/api/v1`;
    }

    return `${origin}/api/v1`;
}

class LabAPIClient {
    constructor(baseURL = resolveLabApiBaseUrl()) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('lab_auth_token') || localStorage.getItem('authToken');
        this.currentExperimentId = null;
        
        console.log('🔗 Lab API Client initialized');
        console.log(`📡 Backend URL: ${this.baseURL}`);
    }

    // =========================================
    // UTILITY METHODS
    // =========================================

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            console.log(`🚀 API Request: ${options.method || 'GET'} ${endpoint}`);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getHeaders(options.auth !== false),
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ API Success: ${endpoint}`, data);
            return data;

        } catch (error) {
            console.error(`❌ API Error: ${endpoint}`, error);
            throw error;
        }
    }

    // =========================================
    // AUTHENTICATION METHODS
    // =========================================

    async register(userData) {
        console.log('📝 Registering new user:', userData.email);
        
        try {
            const response = await this.makeRequest('/lab/auth/register', {
                method: 'POST',
                auth: false,
                body: JSON.stringify(userData)
            });

            this.token = response.access_token;
            localStorage.setItem('lab_auth_token', this.token);
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('lab_current_user', JSON.stringify(response.user));
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            console.log('✅ Registration successful!');
            return response;

        } catch (error) {
            console.error('❌ Registration failed:', error);
            throw error;
        }
    }

    async login(email, password, rememberMe = false) {
        console.log('🔑 Logging in user:', email);
        
        try {
            const response = await this.makeRequest('/lab/auth/login', {
                method: 'POST',
                auth: false,
                body: JSON.stringify({
                    email,
                    password,
                    remember_me: rememberMe
                })
            });

            this.token = response.access_token;
            localStorage.setItem('lab_auth_token', this.token);
            localStorage.setItem('authToken', this.token);
            localStorage.setItem('lab_current_user', JSON.stringify(response.user));
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            
            console.log('✅ Login successful!');
            return response;

        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }

    logout() {
        console.log('👋 Logging out user');
        
        this.token = null;
        this.currentExperimentId = null;
        localStorage.removeItem('lab_auth_token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('lab_current_user');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('current_experiment_id');
        
        console.log('✅ Logout successful');
    }

    getCurrentUser() {
        const userData = localStorage.getItem('lab_current_user') || localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    isAuthenticated() {
        this.token = localStorage.getItem('lab_auth_token') || localStorage.getItem('authToken');
        return !!this.token && !!this.getCurrentUser();
    }

    async getProfile() {
        return this.makeRequest('/lab/auth/me');
    }

    async deleteAccount(password = '') {
        const response = await this.makeRequest('/lab/auth/account', {
            method: 'DELETE',
            body: JSON.stringify({ password })
        });

        this.logout();
        return response;
    }

    async getExperimentCatalog() {
        return this.makeRequest('/lab/content/catalog', {
            auth: false
        });
    }

    async getExperimentContent(experimentKey) {
        return this.makeRequest(`/lab/content/${encodeURIComponent(experimentKey)}`, {
            auth: false
        });
    }

    async getExperimentQuestions(experimentKey, moduleKey = '') {
        const query = moduleKey ? `?moduleKey=${encodeURIComponent(moduleKey)}` : '';
        return this.makeRequest(`/lab/content/${encodeURIComponent(experimentKey)}/questions${query}`, {
            auth: false
        });
    }

    async getExperimentFlashcards(experimentKey, moduleKey = '') {
        const query = moduleKey ? `?moduleKey=${encodeURIComponent(moduleKey)}` : '';
        return this.makeRequest(`/lab/content/${encodeURIComponent(experimentKey)}/flashcards${query}`, {
            auth: false
        });
    }

    // =========================================
    // EXPERIMENT MANAGEMENT
    // =========================================

    async startExperiment(experimentType, experimentName, parameters = {}) {
        console.log(`🧪 Starting experiment: ${experimentType} - ${experimentName}`);
        
        try {
            const response = await this.makeRequest('/lab/experiments/start', {
                method: 'POST',
                body: JSON.stringify({
                    experiment_type: experimentType,
                    experiment_name: experimentName,
                    parameters: parameters
                })
            });

            this.currentExperimentId = response.experiment_id;
            localStorage.setItem('current_experiment_id', this.currentExperimentId.toString());
            
            console.log(`✅ Experiment started with ID: ${this.currentExperimentId}`);
            return response;

        } catch (error) {
            console.error('❌ Failed to start experiment:', error);
            throw error;
        }
    }

    async updateExperiment(experimentId, updateData) {
        console.log(`📊 Updating experiment ${experimentId}:`, updateData);
        
        try {
            const response = await this.makeRequest(`/lab/experiments/${experimentId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });

            console.log('✅ Experiment updated successfully');
            return response;

        } catch (error) {
            console.error('❌ Failed to update experiment:', error);
            throw error;
        }
    }

    async completeExperiment(experimentId, finalData = {}) {
        console.log(`🏁 Completing experiment ${experimentId}`);
        
        return await this.updateExperiment(experimentId, {
            ...finalData,
            status: 'completed'
        });
    }

    // =========================================
    // INTERACTION LOGGING FOR ML
    // =========================================

    async logInteraction(interactionData) {
        // Add current experiment ID if available
        if (this.currentExperimentId) {
            interactionData.experiment_id = this.currentExperimentId;
        }

        try {
            await this.makeRequest('/lab/interactions/log', {
                method: 'POST',
                body: JSON.stringify(interactionData)
            });

            // Don't log success for interactions to avoid spam
        } catch (error) {
            console.error('❌ Failed to log interaction:', error);
            // Don't throw - interactions should be non-blocking
        }
    }

    // Enhanced interaction tracking methods
    trackClick(element, additionalData = {}) {
        this.logInteraction({
            interaction_type: 'click',
            page_section: element.id || element.className || 'unknown',
            interaction_data: {
                element_tag: element.tagName,
                element_id: element.id,
                element_class: element.className,
                element_text: element.textContent?.substring(0, 100),
                ...additionalData
            },
            context: {
                page_url: window.location.pathname,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent
            },
            mouse_coordinates: {
                x: event.clientX,
                y: event.clientY
            },
            viewport_size: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
    }

    trackFormSubmission(formElement, success = true, validationErrors = []) {
        const formData = new FormData(formElement);
        const formFields = Object.fromEntries(formData.entries());
        
        // Remove sensitive data
        const sanitizedFields = Object.keys(formFields).reduce((acc, key) => {
            acc[key] = key.toLowerCase().includes('password') ? '[HIDDEN]' : formFields[key];
            return acc;
        }, {});

        this.logInteraction({
            interaction_type: 'form_submission',
            page_section: formElement.id || 'form',
            interaction_data: {
                form_id: formElement.id,
                form_fields: Object.keys(sanitizedFields),
                field_count: Object.keys(sanitizedFields).length,
                success: success,
                validation_errors: validationErrors
            },
            accuracy: success ? 1.0 : 0.0,
            context: {
                page_url: window.location.pathname,
                form_method: formElement.method,
                form_action: formElement.action
            }
        });
    }

    trackPageView(pageName, loadTime) {
        this.logInteraction({
            interaction_type: 'page_view',
            page_section: pageName,
            interaction_data: {
                page_name: pageName,
                load_time_ms: loadTime,
                referrer: document.referrer
            },
            context: {
                page_url: window.location.pathname,
                timestamp: new Date().toISOString()
            },
            viewport_size: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
    }

    trackExperimentAction(action, details = {}) {
        this.logInteraction({
            interaction_type: 'experiment_action',
            page_section: 'experiment',
            interaction_data: {
                action: action,
                ...details
            },
            context: {
                experiment_id: this.currentExperimentId,
                timestamp: new Date().toISOString()
            }
        });
    }

    // =========================================
    // ANALYTICS AND DATA EXPORT
    // =========================================

    async getUserAnalytics() {
        console.log('📈 Fetching user analytics');
        
        try {
            const analytics = await this.makeRequest('/lab/analytics/user-stats');
            console.log('✅ Analytics retrieved:', analytics);
            return analytics;

        } catch (error) {
            console.error('❌ Failed to get analytics:', error);
            throw error;
        }
    }

    async exportUserData(format = 'json') {
        console.log(`📤 Exporting user data (format: ${format})`);
        
        try {
            const exportData = await this.makeRequest(`/lab/data/export?format=${format}`);
            console.log('✅ Data exported successfully');
            
            // Auto-download if possible
            this.downloadJSON(exportData, `lab-data-${new Date().toISOString().split('T')[0]}.json`);
            
            return exportData;

        } catch (error) {
            console.error('❌ Failed to export data:', error);
            throw error;
        }
    }

    downloadJSON(data, filename) {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log(`💾 Downloaded: ${filename}`);
        } catch (error) {
            console.error('❌ Download failed:', error);
        }
    }

    // =========================================
    // SIGNAL PROCESSING DATA STORAGE
    // =========================================

    async storeSignalData(experimentId, signalData) {
        console.log(`📊 Storing signal data for experiment ${experimentId}`);
        
        return await this.updateExperiment(experimentId, {
            raw_signals: signalData.raw || {},
            processed_signals: signalData.processed || {},
            features_extracted: signalData.features || {}
        });
    }

    async storeAnalysisResults(experimentId, analysisData) {
        console.log(`🧠 Storing analysis results for experiment ${experimentId}`);
        
        return await this.updateExperiment(experimentId, {
            results: analysisData.results || {},
            analysis_results: analysisData.ml_results || {},
            symbolic_reasoning: analysisData.neuro_symbolic || {},
            confidence_scores: analysisData.confidence || {}
        });
    }

    // =========================================
    // HEALTH CHECK
    // =========================================

    async healthCheck() {
        try {
            await fetch(`${this.baseURL}/health`);
            return true;
        } catch (error) {
            console.warn('⚠️ Backend health check failed:', error);
            return false;
        }
    }

    async verifyToken() {
        this.token = localStorage.getItem('lab_auth_token') || localStorage.getItem('authToken');

        if (!this.token) {
            return { valid: false };
        }

        try {
            return await this.makeRequest('/lab/auth/verify');
        } catch (_error) {
            return { valid: false };
        }
    }
}

// =========================================
// GLOBAL INSTANCE AND AUTO-TRACKING
// =========================================

// Create global API client instance
window.labAPI = new LabAPIClient();

// Auto-track page views
document.addEventListener('DOMContentLoaded', () => {
    const startTime = performance.now();
    
    window.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        const pageName = document.title || window.location.pathname.split('/').pop();
        
        if (labAPI.isAuthenticated()) {
            labAPI.trackPageView(pageName, loadTime);
        }
    });
});

// Auto-track clicks on important elements
document.addEventListener('click', (event) => {
    const element = event.target;
    
    // Only track clicks on buttons, links, and interactive elements
    if (element.matches('button, a, .clickable, [data-track="true"]')) {
        if (labAPI.isAuthenticated()) {
            labAPI.trackClick(element);
        }
    }
});

// Enhanced developer tools
window.labDev = {
    ...window.labDev || {},
    
    // API testing methods
    testConnection: async () => {
        const isHealthy = await labAPI.healthCheck();
        console.log(`🏥 Backend health: ${isHealthy ? '✅ Healthy' : '❌ Unavailable'}`);
        return isHealthy;
    },
    
    exportData: async () => {
        if (!labAPI.isAuthenticated()) {
            console.log('❌ Please login first');
            return;
        }
        return await labAPI.exportUserData();
    },
    
    getAnalytics: async () => {
        if (!labAPI.isAuthenticated()) {
            console.log('❌ Please login first');
            return;
        }
        return await labAPI.getUserAnalytics();
    },
    
    simulateExperiment: async (type = 'hrv', name = 'Test Experiment') => {
        if (!labAPI.isAuthenticated()) {
            console.log('❌ Please login first');
            return;
        }
        
        console.log('🧪 Simulating experiment session...');
        
        // Start experiment
        const exp = await labAPI.startExperiment(type, name, { test: true });
        
        // Simulate some interactions
        await labAPI.logInteraction({
            interaction_type: 'experiment_start',
            interaction_data: { simulated: true }
        });
        
        // Add some fake signal data
        await labAPI.storeSignalData(exp.experiment_id, {
            raw: { signal: [1, 2, 3, 4, 5] },
            processed: { filtered: [1.1, 2.1, 3.1, 4.1, 5.1] },
            features: { mean: 3.0, std: 1.58 }
        });
        
        // Complete experiment
        await labAPI.completeExperiment(exp.experiment_id, {
            user_notes: 'Simulated experiment for testing'
        });
        
        console.log('✅ Simulation complete!');
        return exp;
    }
};

console.log('\n🔗 Lab API Client loaded successfully!');
console.log('📋 Available Methods:');
console.log('   • labAPI.register(userData) - Register new user');
console.log('   • labAPI.login(email, password) - Login user');
console.log('   • labAPI.startExperiment(type, name) - Start experiment session');
console.log('   • labAPI.logInteraction(data) - Log user interaction');
console.log('   • labAPI.getUserAnalytics() - Get user statistics');
console.log('   • labAPI.exportUserData() - Export all data');
console.log('💡 Developer tools available via labDev object\n');