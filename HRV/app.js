/* =========================================
   HRV Virtual Lab — Application Controller
   ========================================= */

// Global State
const state = {
    currentStep: 0,
    completedSteps: new Set(),
    equipmentExplored: new Set(),
    selectedCondition: 'relaxed',
    isRecording: false,
    recordedData: null,
    rrIntervals: [],
    analysisData: null,
    engine: null,
    assessmentsShown: {
        pre: false,
        popup: false,
        post: false
    }
};

// Equipment Data
const equipmentData = {
    'ecg-system': {
        name: 'ECG Recording System',
        content: `
            <p>The ECG (Electrocardiography) recording system is the primary instrument for HRV analysis. It captures the electrical activity of the heart with high precision.</p>
            <ul>
                <li><strong>Sampling Rate:</strong> 500-1000 Hz for accurate R-peak detection</li>
                <li><strong>Resolution:</strong> 16-24 bit ADC for detailed waveform capture</li>
                <li><strong>Filters:</strong> High-pass (0.05 Hz) and low-pass (100 Hz) filters</li>
                <li><strong>Input Impedance:</strong> >10 MΩ for clean signal acquisition</li>
            </ul>
            <p>Modern systems use digital signal processing to minimize noise and artifacts for reliable HRV measurements.</p>
        `
    },
    'electrodes': {
        name: 'ECG Electrodes',
        content: `
            <p>Ag/AgCl (Silver/Silver Chloride) electrodes are the gold standard for ECG recording due to their excellent electrical properties.</p>
            <ul>
                <li><strong>Type:</strong> Pre-gelled disposable Ag/AgCl electrodes</li>
                <li><strong>Contact Area:</strong> 10-15 mm diameter for stable contact</li>
                <li><strong>Gel Type:</strong> Wet gel with chloride ions for conductivity</li>
                <li><strong>Adhesive:</strong> Medical-grade adhesive for skin attachment</li>
            </ul>
            <p>Proper electrode placement is critical for accurate R-peak detection and subsequent HRV analysis.</p>
        `
    },
    'leads': {
        name: 'Lead Configuration',
        content: `
            <p>For HRV analysis, a simplified lead configuration is typically used to capture clear R-peaks.</p>
            <ul>
                <li><strong>Lead II:</strong> Most commonly used (RA to LL) - produces upright R-waves</li>
                <li><strong>3-Lead System:</strong> RA (Right Arm), LA (Left Arm), LL (Left Leg)</li>
                <li><strong>Ground Electrode:</strong> Usually placed on RL (Right Leg)</li>
                <li><strong>Chest Leads:</strong> Optional for detailed cardiac assessment</li>
            </ul>
            <p>Lead II provides optimal R-wave morphology for automated beat detection algorithms.</p>
        `
    },
    'gel': {
        name: 'Conductive Gel',
        content: `
            <p>Conductive gel reduces electrode-skin impedance, improving signal quality significantly.</p>
            <ul>
                <li><strong>Type:</strong> Electrolyte gel with ionic conductivity</li>
                <li><strong>Application:</strong> Applied between electrode and skin</li>
                <li><strong>Impedance Reduction:</strong> Can reduce impedance to &lt;5 kΩ</li>
                <li><strong>Duration:</strong> Maintains conductivity for 30-60 minutes</li>
            </ul>
            <p>Lower impedance results in higher signal-to-noise ratio and more accurate HRV measurements.</p>
        `
    },
    'swabs': {
        name: 'Alcohol Prep Swabs',
        content: `
            <p>Skin preparation is essential for achieving low electrode-skin impedance and artifact-free recordings.</p>
            <ul>
                <li><strong>Purpose:</strong> Remove oils, dead skin cells, and contaminants</li>
                <li><strong>Content:</strong> 70% Isopropyl alcohol solution</li>
                <li><strong>Technique:</strong> Gentle circular motion at electrode sites</li>
                <li><strong>Drying Time:</strong> Allow 30 seconds before electrode placement</li>
            </ul>
            <p>Proper skin preparation can reduce impedance by 50% or more, significantly improving signal quality.</p>
        `
    },
    'software': {
        name: 'HRV Analysis Software',
        content: `
            <p>Specialized software performs R-peak detection and calculates HRV metrics from the ECG signal.</p>
            <ul>
                <li><strong>R-Peak Detection:</strong> Pan-Tompkins or similar algorithms</li>
                <li><strong>Artifact Correction:</strong> Automatic and manual ectopic beat handling</li>
                <li><strong>Time-Domain:</strong> SDNN, RMSSD, pNN50 calculations</li>
                <li><strong>Frequency-Domain:</strong> FFT/AR spectral analysis (LF, HF, LF/HF)</li>
                <li><strong>Nonlinear:</strong> Poincaré plot analysis (SD1, SD2)</li>
            </ul>
            <p>The software follows Task Force of ESC/NASPE guidelines for standardized HRV measurement.</p>
        `
    }
};

// Glossary Data
const glossaryTerms = [
    { term: 'Heart Rate Variability (HRV)', definition: 'The variation in time intervals between consecutive heartbeats. It reflects the dynamic interplay between the sympathetic and parasympathetic branches of the autonomic nervous system.' },
    { term: 'R-R Interval', definition: 'The time between successive R-peaks on an ECG, measured in milliseconds. Also called the inter-beat interval (IBI) or NN interval when only normal beats are considered.' },
    { term: 'SDNN', definition: 'Standard Deviation of all NN intervals. A global measure of HRV reflecting all cyclic components responsible for variability. Normal values: 100-180 ms in healthy adults.' },
    { term: 'RMSSD', definition: 'Root Mean Square of Successive Differences between adjacent NN intervals. Primarily reflects parasympathetic (vagal) activity. Normal values: 20-50 ms.' },
    { term: 'pNN50', definition: 'Percentage of successive NN intervals differing by more than 50 ms. Another measure of parasympathetic activity. Normal range: 3-40%.' },
    { term: 'Low Frequency (LF)', definition: 'Power in the 0.04-0.15 Hz frequency band. Reflects a mixture of sympathetic and parasympathetic activity, often associated with baroreceptor activity.' },
    { term: 'High Frequency (HF)', definition: 'Power in the 0.15-0.4 Hz frequency band. Primarily reflects parasympathetic (vagal) activity and corresponds to respiratory sinus arrhythmia.' },
    { term: 'LF/HF Ratio', definition: 'The ratio of Low Frequency to High Frequency power. Often interpreted as reflecting sympathovagal balance, though this interpretation is debated.' },
    { term: 'Poincaré Plot', definition: 'A scatter plot where each RR interval is plotted against the previous RR interval. Used for nonlinear HRV analysis, revealing patterns not visible in frequency analysis.' },
    { term: 'SD1', definition: 'The standard deviation perpendicular to the line of identity in a Poincaré plot. Reflects short-term HRV and parasympathetic activity.' },
    { term: 'SD2', definition: 'The standard deviation along the line of identity in a Poincaré plot. Reflects long-term HRV and represents both sympathetic and parasympathetic influences.' },
    { term: 'Sympathetic Nervous System (SNS)', definition: 'The "fight or flight" branch of the autonomic nervous system. Increases heart rate, decreases HRV, and prepares the body for action.' },
    { term: 'Parasympathetic Nervous System (PNS)', definition: 'The "rest and digest" branch of the ANS. Decreases heart rate, increases HRV, and promotes recovery and restoration.' },
    { term: 'Autonomic Nervous System (ANS)', definition: 'The part of the nervous system that controls involuntary functions including heart rate, digestion, and respiratory rate.' },
    { term: 'Respiratory Sinus Arrhythmia (RSA)', definition: 'Natural fluctuation in heart rate synchronized with breathing - heart rate increases during inspiration and decreases during expiration.' }
];

/* =========================================
   Initialization
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    simulateLoading();
});

function simulateLoading() {
    const loadFill = document.getElementById('load-progress');
    const loadScreen = document.getElementById('loading-screen');
    
    if (!loadFill || !loadScreen) {
        console.warn('Loading elements not found, skipping loading animation');
        document.getElementById('app')?.classList.remove('hidden');
        initializeApp();
        return;
    }
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
                loadScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadScreen.classList.add('hidden');
                    document.getElementById('app')?.classList.remove('hidden');
                    initializeApp();
                }, 500);
            }, 300);
        }
        if (loadFill) loadFill.style.width = `${progress}%`;
    }, 100);
}

function initializeApp() {
    enforceAuthForLab();

    // Initialize the HRV Signal Engine
    state.engine = new HRVSignalEngine();
    
    // Setup Navigation
    setupNavigation();
    
    // Setup Step Buttons
    setupStepButtons();
    
    // Setup Equipment Interactions
    setupEquipment();
    
    // Setup Condition Selection
    setupConditions();
    
    // Setup Recording Controls
    setupRecording();
    
    // Setup Analysis Tabs
    setupAnalysisTabs();
    
    // Setup Glossary Modal
    setupGlossary();

    // Setup pre/post/popup/flashcard actions
    setupAssessmentButtons();
    
    // Initialize Canvas Displays
    initializeCanvases();
    
    // Show first step
    navigateToStep(0);
    
    console.log('HRV Virtual Lab initialized successfully');
}

function enforceAuthForLab() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('lab_auth_token');
    if (!token) {
        window.location.href = '../login.html';
    }
}

function runPreTest(callback) {
    if (!window.QuizModule || typeof window.QuizModule.startPreTest !== 'function') {
        if (typeof callback === 'function') callback();
        return;
    }

    window.QuizModule.startPreTest('hrv', () => {
        state.assessmentsShown.pre = true;
        if (typeof callback === 'function') callback();
    });
}

function runPopupQuestion(callback) {
    if (!window.QuizModule || typeof window.QuizModule.showPopupQuestion !== 'function') {
        if (typeof callback === 'function') callback();
        return;
    }

    window.QuizModule.showPopupQuestion('hrv', () => {
        state.assessmentsShown.popup = true;
        if (typeof callback === 'function') callback();
    });
}

function runPostTest(callback) {
    if (!window.QuizModule || typeof window.QuizModule.startPostTest !== 'function') {
        if (typeof callback === 'function') callback();
        return;
    }

    window.QuizModule.startPostTest('hrv', () => {
        state.assessmentsShown.post = true;
        if (typeof callback === 'function') callback();
    });
}

function setupAssessmentButtons() {
    const flashcardBtn = document.getElementById('flashcard-btn');
    if (flashcardBtn) {
        flashcardBtn.addEventListener('click', () => {
            if (window.QuizModule?.showFlashcards) {
                window.QuizModule.showFlashcards('hrv');
            }
        });
    }

    const pretestBtn = document.getElementById('pretest-btn');
    if (pretestBtn) {
        pretestBtn.addEventListener('click', () => runPreTest());
    }

    const popupBtn = document.getElementById('popup-quiz-btn');
    if (popupBtn) {
        popupBtn.addEventListener('click', () => runPopupQuestion());
    }

    const posttestBtn = document.getElementById('posttest-btn');
    if (posttestBtn) {
        posttestBtn.addEventListener('click', () => runPostTest());
    }
}

/* =========================================
   Step Button Handlers
   ========================================= */
function setupStepButtons() {
    // Start - Begin Experiment button
    const startLabBtn = document.getElementById('start-lab-btn');
    if (startLabBtn) {
        startLabBtn.addEventListener('click', () => {
            if (!state.assessmentsShown.pre) {
                runPreTest(() => {
                    state.completedSteps.add(0);
                    navigateToStep(1);
                });
                return;
            }

            state.completedSteps.add(0);
            navigateToStep(1);
        });
    }
    
    // Equipment - Continue to Recording
    const equipNextBtn = document.getElementById('equip-next-btn');
    if (equipNextBtn) {
        equipNextBtn.addEventListener('click', () => {
            state.completedSteps.add(1);
            navigateToStep(2);
        });
    }
    
    // Recording - Continue to Analysis
    const recordingNextBtn = document.getElementById('recording-next-btn');
    if (recordingNextBtn) {
        recordingNextBtn.addEventListener('click', () => {
            if (!state.assessmentsShown.popup) {
                runPopupQuestion(() => {
                    state.completedSteps.add(2);
                    navigateToStep(3);
                });
                return;
            }

            state.completedSteps.add(2);
            navigateToStep(3);
        });
    }
    
    // Analysis - Continue to Clinical
    const analysisNextBtn = document.getElementById('analysis-next-btn');
    if (analysisNextBtn) {
        analysisNextBtn.addEventListener('click', () => {
            if (!state.assessmentsShown.post) {
                runPostTest(() => {
                    state.completedSteps.add(3);
                    navigateToStep(4);
                });
                return;
            }

            state.completedSteps.add(3);
            navigateToStep(4);
        });
    }
    
    // Analyze button (moves to analysis step)
    const btnAnalyze = document.getElementById('btn-analyze');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', () => {
            state.completedSteps.add(2);
            navigateToStep(3);
        });
    }
    
}

/* =========================================
   Navigation
   ========================================= */
function setupNavigation() {
    const navSteps = document.querySelectorAll('.nav-step');
    navSteps.forEach((step) => {
        step.addEventListener('click', () => {
            const stepIndex = parseInt(step.dataset.step);
            // Only allow navigation to completed steps or next available step
            if (canAccessStep(stepIndex)) {
                console.log('Navigating to step:', stepIndex);
                navigateToStep(stepIndex);
            }
        });
    });
    
    // Navigation buttons
    document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetStep = parseInt(btn.dataset.nav);
            if (canAccessStep(targetStep)) {
                navigateToStep(targetStep);
            }
        });
    });
}

function canAccessStep(stepIndex) {
    // Step 0 always accessible
    if (stepIndex === 0) return true;
    // Can access completed steps (to go back)
    if (state.completedSteps.has(stepIndex)) return true;
    // Can access next step if previous is completed
    return state.completedSteps.has(stepIndex - 1);
}

function navigateToStep(stepIndex) {
    state.currentStep = stepIndex;
    
    // Update nav UI
    document.querySelectorAll('.nav-step').forEach((step) => {
        const navStepIndex = parseInt(step.dataset.step);
        step.classList.toggle('active', navStepIndex === stepIndex);
        step.classList.toggle('completed', state.completedSteps.has(navStepIndex));
        // Add locked visual for inaccessible steps
        step.classList.toggle('locked', !canAccessStep(navStepIndex) && navStepIndex !== stepIndex);
    });
    
    // Show active step content
    document.querySelectorAll('.lab-step').forEach((step) => {
        const stepId = step.id;
        const stepNum = parseInt(stepId.replace('step-', ''));
        step.classList.toggle('active', stepNum === stepIndex);
    });
    
    console.log('Step ' + stepIndex + ' is now active');
    
    // Initialize step-specific features
    initializeStepFeatures(stepIndex);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeStepFeatures(stepIndex) {
    switch (stepIndex) {
        case 0: // Start (Introduction + ANS Theory)
            animateWelcomeECG();
            animateANSVisualizations();
            break;
        case 1: // Equipment
            updateEquipmentProgress();
            animateEquipmentECG();
            break;
        case 2: // Recording
            initializeRecordingView();
            break;
        case 3: // Analysis
            initializeAnalysisView();
            setupAnalysisScrollCompletion();
            break;
        case 4: // Clinical
            updateResultsSummary();
            setupClinicalScrollCompletion();
            break;
    }
}

function setupClinicalScrollCompletion() {
    const completionSection = document.querySelector('.completion-section');
    if (!completionSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Mark step 4 as completed when completion section is visible
                state.completedSteps.add(4);
                // Update nav UI to show green checkmark
                document.querySelectorAll('.nav-step').forEach((step) => {
                    const navStepIndex = parseInt(step.dataset.step);
                    step.classList.toggle('completed', state.completedSteps.has(navStepIndex));
                });
                // Disconnect observer after completion
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(completionSection);
}

function setupAnalysisScrollCompletion() {
    const analysisNextBtn = document.getElementById('analysis-next-btn');
    if (!analysisNextBtn) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Mark step 3 as completed when analysis "Continue" button is visible
                state.completedSteps.add(3);
                // Update nav UI to show green checkmark
                document.querySelectorAll('.nav-step').forEach((step) => {
                    const navStepIndex = parseInt(step.dataset.step);
                    step.classList.toggle('completed', state.completedSteps.has(navStepIndex));
                });
                // Disconnect observer after completion
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(analysisNextBtn);
}

/* =========================================
   Introduction Step - Welcome ECG Animation
   ========================================= */
function animateWelcomeECG() {
    const canvas = document.getElementById('welcome-ecg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let offset = 0;
    
    function draw() {
        ctx.fillStyle = '#1a2332';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        drawECGGrid(ctx, width, height);
        
        // Draw ECG waveform
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const baselineY = height / 2;
        const amplitude = height * 0.35;
        
        for (let x = 0; x < width; x++) {
            const t = (x + offset) / 80;
            const y = baselineY - getECGValue(t) * amplitude;
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        offset += 1.5;
        requestAnimationFrame(draw);
    }
    
    draw();
}

function getECGValue(t) {
    // Simplified ECG waveform model
    const period = 1;
    const phase = t % period;
    
    // P wave (0.0 - 0.1)
    if (phase < 0.1) {
        return 0.1 * Math.sin(phase * Math.PI / 0.1);
    }
    // PR segment (0.1 - 0.15)
    else if (phase < 0.15) {
        return 0;
    }
    // Q wave (0.15 - 0.18)
    else if (phase < 0.18) {
        return -0.1 * Math.sin((phase - 0.15) * Math.PI / 0.03);
    }
    // R wave (0.18 - 0.23)
    else if (phase < 0.23) {
        const rPhase = (phase - 0.18) / 0.05;
        if (rPhase < 0.5) {
            return rPhase * 2;
        } else {
            return 1 - (rPhase - 0.5) * 2;
        }
    }
    // S wave (0.23 - 0.28)
    else if (phase < 0.28) {
        return -0.2 * Math.sin((phase - 0.23) * Math.PI / 0.05);
    }
    // ST segment (0.28 - 0.35)
    else if (phase < 0.35) {
        return 0;
    }
    // T wave (0.35 - 0.5)
    else if (phase < 0.5) {
        return 0.2 * Math.sin((phase - 0.35) * Math.PI / 0.15);
    }
    // Baseline
    return 0;
}

function drawECGGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Small grid (5px)
    const smallGrid = 10;
    for (let x = 0; x < width; x += smallGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += smallGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Large grid (25px)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const largeGrid = 50;
    for (let x = 0; x < width; x += largeGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += largeGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

/* =========================================
   ANS Theory Step - Visualizations
   ========================================= */
function animateANSVisualizations() {
    animateSNSCanvas();
    animatePNSCanvas();
}

function animateSNSCanvas() {
    const canvas = document.getElementById('sns-ecg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let offset = 0;
    const heartRate = 100; // Higher HR for SNS
    
    function draw() {
        ctx.fillStyle = '#1a2332';
        ctx.fillRect(0, 0, width, height);
        
        // Draw ECG with faster rate (SNS = high HR, low HRV)
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        const baselineY = height / 2;
        const amplitude = height * 0.35;
        const periodFactor = 60 / heartRate; // Shorter periods
        
        for (let x = 0; x < width; x++) {
            const t = (x + offset) / (80 * periodFactor);
            const y = baselineY - getECGValue(t) * amplitude;
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        offset += 2;
        requestAnimationFrame(draw);
    }
    
    draw();
}

function animatePNSCanvas() {
    const canvas = document.getElementById('pns-ecg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let offset = 0;
    const heartRate = 60; // Lower HR for PNS
    
    function draw() {
        ctx.fillStyle = '#1a2332';
        ctx.fillRect(0, 0, width, height);
        
        // Draw ECG with slower rate (PNS = low HR, high HRV)
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        const baselineY = height / 2;
        const amplitude = height * 0.35;
        const periodFactor = 60 / heartRate; // Longer periods
        
        for (let x = 0; x < width; x++) {
            const t = (x + offset) / (80 * periodFactor);
            const y = baselineY - getECGValue(t) * amplitude;
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        offset += 1;
        requestAnimationFrame(draw);
    }
    
    draw();
}

/* =========================================
   Equipment Step
   ========================================= */
function setupEquipment() {
    document.querySelectorAll('.equipment-item').forEach(item => {
        item.addEventListener('click', () => {
            const equipId = item.dataset.equipment;
            showEquipmentDetails(equipId);
            
            // Mark as explored
            state.equipmentExplored.add(equipId);
            item.classList.add('explored');
            
            updateEquipmentProgress();
        });
    });
}

function showEquipmentDetails(equipId) {
    const data = equipmentData[equipId];
    if (!data) return;
    
    const placeholder = document.querySelector('.info-placeholder');
    const details = document.querySelector('.info-details');
    const title = document.getElementById('equip-detail-title');
    const body = document.getElementById('equip-detail-body');
    
    if (placeholder) placeholder.classList.add('hidden');
    if (details) {
        details.classList.remove('hidden');
        title.textContent = data.name;
        body.innerHTML = data.content;
    }
}

function updateEquipmentProgress() {
    const total = Object.keys(equipmentData).length;
    const explored = state.equipmentExplored.size;
    const percentage = (explored / total) * 100;
    
    const progressFill = document.getElementById('equip-progress-fill');
    const progressText = document.getElementById('equip-progress-text');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    if (progressText) {
        progressText.textContent = `${explored} of ${total} items explored`;
    }
    
    // Enable proceed button if all explored
    const proceedBtn = document.getElementById('equip-next-btn');
    if (proceedBtn && explored === total) {
        proceedBtn.classList.remove('hidden');
    }
}

let equipmentEcgAnimationId = null;

function animateEquipmentECG() {
    const canvas = document.getElementById('equipment-ecg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let offset = 0;
    
    function draw() {
        // Only animate if still on equipment step
        if (state.currentStep !== 1) {
            if (equipmentEcgAnimationId) {
                cancelAnimationFrame(equipmentEcgAnimationId);
                equipmentEcgAnimationId = null;
            }
            return;
        }
        
        ctx.fillStyle = '#1a2332';
        ctx.fillRect(0, 0, width, height);
        
        // Draw subtle grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw ECG waveform
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const baselineY = height / 2;
        const amplitude = height * 0.35;
        const beatLength = 150;
        
        for (let x = 0; x < width; x++) {
            const phase = ((x + offset) % beatLength) / beatLength;
            let y = baselineY;
            
            // P wave
            if (phase >= 0 && phase < 0.08) {
                y = baselineY - Math.sin(phase / 0.08 * Math.PI) * amplitude * 0.12;
            }
            // Q wave
            else if (phase >= 0.12 && phase < 0.15) {
                y = baselineY + Math.sin((phase - 0.12) / 0.03 * Math.PI) * amplitude * 0.08;
            }
            // R wave (peak)
            else if (phase >= 0.15 && phase < 0.22) {
                const rPhase = (phase - 0.15) / 0.07;
                if (rPhase < 0.5) {
                    y = baselineY - rPhase * 2 * amplitude;
                } else {
                    y = baselineY - (1 - (rPhase - 0.5) * 2) * amplitude;
                }
            }
            // S wave
            else if (phase >= 0.22 && phase < 0.26) {
                y = baselineY + Math.sin((phase - 0.22) / 0.04 * Math.PI) * amplitude * 0.15;
            }
            // T wave
            else if (phase >= 0.35 && phase < 0.50) {
                y = baselineY - Math.sin((phase - 0.35) / 0.15 * Math.PI) * amplitude * 0.25;
            }
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        offset += 1.5; // Slow scroll speed
        equipmentEcgAnimationId = requestAnimationFrame(draw);
    }
    
    // Cancel any existing animation
    if (equipmentEcgAnimationId) {
        cancelAnimationFrame(equipmentEcgAnimationId);
    }
    
    draw();
}

/* =========================================
   Recording Step
   ========================================= */
function setupConditions() {
    document.querySelectorAll('.condition-card').forEach(card => {
        card.addEventListener('click', () => {
            const condition = card.dataset.condition;
            selectCondition(condition);
        });
    });
}

function selectCondition(condition) {
    state.selectedCondition = condition;
    
    document.querySelectorAll('.condition-card').forEach(card => {
        card.classList.toggle('active', card.dataset.condition === condition);
    });
    
    // Update the signal engine
    if (state.engine) {
        state.engine.setCondition(condition);
    }
    
    // Update displays if recording
    if (state.isRecording) {
        updateLiveDisplay();
    }
}

function setupRecording() {
    const btnRecord = document.getElementById('btn-record');
    const btnStop = document.getElementById('btn-stop');
    const btnAnalyze = document.getElementById('btn-analyze');
    
    if (btnRecord) {
        btnRecord.addEventListener('click', startRecording);
    }
    if (btnStop) {
        btnStop.addEventListener('click', stopRecording);
    }
    // Note: btn-analyze handler is set in setupStepButtons
}

function initializeRecordingView() {
    // Start live ECG animation
    animateLiveECG();
}

let ecgAnimationId = null;
let recordingStartTime = null;
let recordingTimer = null;
let ecgBuffer = [];
let ecgBufferIndex = 0;
let lastBeatTime = 0;
let currentRRInterval = 850;

function animateLiveECG() {
    const canvas = document.getElementById('ecg-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Initialize buffer with baseline
    ecgBuffer = new Array(width).fill(0);
    ecgBufferIndex = 0;
    
    // Get initial RR interval based on condition
    if (state.engine) {
        currentRRInterval = state.engine.getCurrentRRInterval();
    }
    
    let lastFrameTime = 0;
    const pixelsPerSecond = 100; // Realistic ECG paper speed (25mm/s scaled)
    
    function draw(timestamp) {
        if (!lastFrameTime) lastFrameTime = timestamp;
        const deltaTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;
        
        // Calculate how many pixels to advance (slower, realistic speed)
        const pixelsToAdvance = Math.max(1, Math.round(pixelsPerSecond * deltaTime / 1000));
        
        // Generate new signal data points
        if (state.engine) {
            for (let i = 0; i < pixelsToAdvance; i++) {
                const signalPoint = generateRealisticECGPoint();
                ecgBuffer.push(signalPoint);
                ecgBuffer.shift();
            }
        }
        
        // Clear canvas
        ctx.fillStyle = '#1a2332';
        ctx.fillRect(0, 0, width, height);
        
        drawECGGrid(ctx, width, height);
        
        // Draw ECG trace
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const baselineY = height / 2;
        const amplitude = height * 0.35;
        
        for (let i = 0; i < ecgBuffer.length; i++) {
            const x = i;
            const y = baselineY - ecgBuffer[i] * amplitude;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Update heart rate display with realistic values
        updateHeartRateDisplay();
        
        // Update heart animation
        updateHeartAnimation();
        
        ecgAnimationId = requestAnimationFrame(draw);
    }
    
    // Cancel any existing animation
    if (ecgAnimationId) {
        cancelAnimationFrame(ecgAnimationId);
    }
    
    draw(0);
}

let ecgPhase = 0;
let samplesSinceBeat = 0;
let samplesPerBeat = 425; // ~141 bpm default, will be updated

function generateRealisticECGPoint() {
    if (!state.engine) return 0;
    
    // Update RR interval periodically
    if (samplesSinceBeat === 0) {
        currentRRInterval = state.engine.generateRRInterval();
        // Convert RR interval (ms) to samples at 500 samples/sec display rate
        // But we're advancing at pixelsPerSecond, so scale appropriately
        samplesPerBeat = Math.round(currentRRInterval / 10); // Slow it down significantly
    }
    
    // Calculate phase within current beat (0 to 1)
    const beatPhase = samplesSinceBeat / samplesPerBeat;
    
    // Generate ECG waveform point
    const value = generateECGWaveform(beatPhase);
    
    // Advance phase
    samplesSinceBeat++;
    
    // Check for new beat
    if (samplesSinceBeat >= samplesPerBeat) {
        samplesSinceBeat = 0;
        // Trigger heart beat animation
        triggerHeartBeat();
    }
    
    return value;
}

function generateECGWaveform(phase) {
    let value = 0;
    
    // P wave (atrial depolarization) - 0.0 to 0.08
    if (phase >= 0 && phase < 0.08) {
        const pPhase = phase / 0.08;
        value = 0.12 * Math.sin(pPhase * Math.PI);
    }
    // PR segment - 0.08 to 0.12
    else if (phase >= 0.08 && phase < 0.12) {
        value = 0;
    }
    // Q wave - 0.12 to 0.14
    else if (phase >= 0.12 && phase < 0.14) {
        const qPhase = (phase - 0.12) / 0.02;
        value = -0.08 * Math.sin(qPhase * Math.PI);
    }
    // R wave (ventricular depolarization peak) - 0.14 to 0.18
    else if (phase >= 0.14 && phase < 0.18) {
        const rPhase = (phase - 0.14) / 0.04;
        if (rPhase < 0.5) {
            value = rPhase * 2; // Rising edge
        } else {
            value = 1 - (rPhase - 0.5) * 2; // Falling edge
        }
    }
    // S wave - 0.18 to 0.21
    else if (phase >= 0.18 && phase < 0.21) {
        const sPhase = (phase - 0.18) / 0.03;
        value = -0.15 * Math.sin(sPhase * Math.PI);
    }
    // ST segment - 0.21 to 0.30
    else if (phase >= 0.21 && phase < 0.30) {
        value = 0;
    }
    // T wave (ventricular repolarization) - 0.30 to 0.45
    else if (phase >= 0.30 && phase < 0.45) {
        const tPhase = (phase - 0.30) / 0.15;
        value = 0.25 * Math.sin(tPhase * Math.PI);
    }
    // Baseline - 0.45 to 1.0
    else {
        value = 0;
    }
    
    // Add small noise
    value += (Math.random() - 0.5) * 0.02;
    
    return value;
}

let heartBeatTriggered = false;
let heartBeatTime = 0;

function triggerHeartBeat() {
    heartBeatTriggered = true;
    heartBeatTime = Date.now();
    
    // Add beating class for CSS animation
    const heartContainer = document.querySelector('.heart-beat-indicator');
    if (heartContainer) {
        heartContainer.classList.remove('beating');
        // Force reflow to restart animation
        void heartContainer.offsetWidth;
        heartContainer.classList.add('beating');
    }
}

function updateHeartAnimation() {
    const heartIcon = document.getElementById('heart-beat-icon');
    if (!heartIcon) return;
    
    if (heartBeatTriggered) {
        const elapsed = Date.now() - heartBeatTime;
        if (elapsed < 100) {
            heartIcon.style.color = '#ff2222';
        } else if (elapsed < 300) {
            heartIcon.style.color = '#e74c3c';
        } else {
            heartBeatTriggered = false;
            // Remove beating class after animation completes
            const heartContainer = document.querySelector('.heart-beat-indicator');
            if (heartContainer) {
                heartContainer.classList.remove('beating');
            }
        }
    }
}

function updateHeartRateDisplay() {
    const hrValue = document.getElementById('hr-value');
    const rrValue = document.getElementById('rr-value');
    
    if (state.engine) {
        // Use the actual current RR interval for accurate sync
        const rr = currentRRInterval;
        const hr = Math.round(60000 / rr);
        
        if (hrValue) hrValue.textContent = hr;
        if (rrValue) rrValue.textContent = rr;
    }
}

function startRecording() {
    state.isRecording = true;
    state.rrIntervals = [];
    recordingStartTime = Date.now();
    
    // Update UI
    document.getElementById('btn-record')?.classList.add('hidden');
    document.getElementById('btn-stop')?.classList.remove('hidden');
    document.getElementById('record-timer')?.classList.remove('hidden');
    document.getElementById('btn-analyze')?.classList.add('hidden');
    
    // Start timer
    recordingTimer = setInterval(updateRecordingTimer, 1000);
    
    // Start data collection
    collectRRIntervals();
}

function stopRecording() {
    state.isRecording = false;
    
    // Update UI
    document.getElementById('btn-stop')?.classList.add('hidden');
    document.getElementById('btn-record')?.classList.remove('hidden');
    document.getElementById('btn-analyze')?.classList.remove('hidden');
    
    // Stop timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    // Process recorded data
    processRecordedData();
    
    // Update tachogram
    updateTachogram();
}

function updateRecordingTimer() {
    const elapsed = Date.now() - recordingStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function collectRRIntervals() {
    if (!state.isRecording) return;
    
    if (state.engine) {
        const rr = state.engine.generateRRInterval();
        state.rrIntervals.push(rr);
    }
    
    setTimeout(collectRRIntervals, state.engine?.getCurrentRRInterval() || 850);
}

function processRecordedData() {
    if (state.rrIntervals.length < 5) {
        // Generate some sample data if not enough collected
        state.rrIntervals = state.engine?.generateRRSeries(100) || [];
    }
    
    state.recordedData = {
        rrIntervals: state.rrIntervals,
        duration: Date.now() - recordingStartTime,
        condition: state.selectedCondition
    };
    
    // Calculate analysis data
    state.analysisData = calculateHRVMetrics(state.rrIntervals);
}

function updateTachogram() {
    const canvas = document.getElementById('tachogram-canvas');
    if (!canvas || state.rrIntervals.length < 2) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    // Draw axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, height - 30);
    ctx.lineTo(width - 10, height - 30);
    ctx.stroke();
    
    // Draw RR intervals
    const data = state.rrIntervals.slice(-50);
    const maxRR = Math.max(...data);
    const minRR = Math.min(...data);
    const range = maxRR - minRR || 100;
    
    const plotWidth = width - 60;
    const plotHeight = height - 50;
    const step = plotWidth / (data.length - 1);
    
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((rr, i) => {
        const x = 40 + i * step;
        const y = 10 + plotHeight - ((rr - minRR) / range) * plotHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#e74c3c';
    data.forEach((rr, i) => {
        const x = 40 + i * step;
        const y = 10 + plotHeight - ((rr - minRR) / range) * plotHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Update stats
    const meanRR = document.getElementById('mean-rr');
    const minRREl = document.getElementById('min-rr');
    const maxRREl = document.getElementById('max-rr');
    const beats = document.getElementById('total-beats');
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    
    if (meanRR) meanRR.textContent = Math.round(mean);
    if (minRREl) minRREl.textContent = Math.round(Math.min(...data));
    if (maxRREl) maxRREl.textContent = Math.round(Math.max(...data));
    if (beats) beats.textContent = data.length;
}

/* =========================================
   Analysis Step
   ========================================= */
function setupAnalysisTabs() {
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            showAnalysisPanel(target);
        });
    });
}

function showAnalysisPanel(tabId) {
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Match panel IDs with -panel suffix
    const panelId = tabId + '-panel';
    document.querySelectorAll('.analysis-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === panelId);
    });
    
    // Trigger panel-specific updates
    switch (tabId) {
        case 'time-domain':
            updateTimeDomainAnalysis();
            break;
        case 'frequency-domain':
            updateFrequencyDomainAnalysis();
            break;
        case 'nonlinear':
            updateNonlinearAnalysis();
            break;
    }
}

function initializeAnalysisView() {
    // Ensure recording step is marked complete when entering analysis
    if (!state.completedSteps.has(2)) {
        state.completedSteps.add(2);
        // Update nav UI
        document.querySelectorAll('.nav-step').forEach((step) => {
            const navStepIndex = parseInt(step.dataset.step);
            step.classList.toggle('completed', state.completedSteps.has(navStepIndex));
        });
    }
    
    // Ensure we have data
    if (!state.rrIntervals || state.rrIntervals.length < 5) {
        state.rrIntervals = state.engine?.generateRRSeries(100) || generateSampleRRData();
        state.analysisData = calculateHRVMetrics(state.rrIntervals);
    }
    
    // Default to time-domain view
    showAnalysisPanel('time-domain');
}

function generateSampleRRData() {
    const data = [];
    const baseRR = 850;
    for (let i = 0; i < 100; i++) {
        const variation = (Math.random() - 0.5) * 100;
        data.push(baseRR + variation);
    }
    return data;
}

function calculateHRVMetrics(rrIntervals) {
    if (!rrIntervals || rrIntervals.length < 2) {
        return getDefaultMetrics();
    }
    
    const rr = rrIntervals;
    const n = rr.length;
    
    // Mean RR
    const meanRR = rr.reduce((a, b) => a + b, 0) / n;
    
    // Mean HR
    const meanHR = 60000 / meanRR;
    
    // SDNN - Standard deviation of NN intervals
    const sdnn = Math.sqrt(rr.reduce((sum, val) => sum + Math.pow(val - meanRR, 2), 0) / (n - 1));
    
    // RMSSD - Root mean square of successive differences
    let sumSqDiff = 0;
    for (let i = 1; i < n; i++) {
        sumSqDiff += Math.pow(rr[i] - rr[i-1], 2);
    }
    const rmssd = Math.sqrt(sumSqDiff / (n - 1));
    
    // pNN50 - Percentage of successive differences > 50ms
    let nn50 = 0;
    for (let i = 1; i < n; i++) {
        if (Math.abs(rr[i] - rr[i-1]) > 50) {
            nn50++;
        }
    }
    const pnn50 = (nn50 / (n - 1)) * 100;
    
    // Frequency domain (simplified estimation)
    const { lf, hf, lfhfRatio } = estimateFrequencyDomain(rr);
    
    // Poincaré plot metrics (SD1, SD2)
    const { sd1, sd2 } = calculatePoincareMetrics(rr);
    
    return {
        meanRR: Math.round(meanRR),
        meanHR: Math.round(meanHR * 10) / 10,
        sdnn: Math.round(sdnn * 10) / 10,
        rmssd: Math.round(rmssd * 10) / 10,
        pnn50: Math.round(pnn50 * 10) / 10,
        lf: Math.round(lf),
        hf: Math.round(hf),
        lfhfRatio: Math.round(lfhfRatio * 100) / 100,
        sd1: Math.round(sd1 * 10) / 10,
        sd2: Math.round(sd2 * 10) / 10
    };
}

function getDefaultMetrics() {
    return {
        meanRR: 850,
        meanHR: 70.6,
        sdnn: 45.2,
        rmssd: 32.5,
        pnn50: 18.4,
        lf: 856,
        hf: 724,
        lfhfRatio: 1.18,
        sd1: 22.8,
        sd2: 58.3
    };
}

function estimateFrequencyDomain(rrIntervals) {
    // Simplified frequency domain estimation
    // In a real app, this would use FFT or AR modeling
    
    const n = rrIntervals.length;
    if (n < 10) return { lf: 500, hf: 500, lfhfRatio: 1.0 };
    
    // Calculate successive differences for HF estimation
    let hdDiff = 0;
    for (let i = 1; i < n; i++) {
        hdDiff += Math.pow(rrIntervals[i] - rrIntervals[i-1], 2);
    }
    const hf = hdDiff / (n - 1) * 0.5;
    
    // Calculate total variance for LF estimation
    const mean = rrIntervals.reduce((a, b) => a + b, 0) / n;
    let totalVar = 0;
    for (let i = 0; i < n; i++) {
        totalVar += Math.pow(rrIntervals[i] - mean, 2);
    }
    const lf = (totalVar / (n - 1) * 0.4) - (hf * 0.3);
    
    return {
        lf: Math.max(100, lf),
        hf: Math.max(100, hf),
        lfhfRatio: Math.max(0.1, lf / hf)
    };
}

function calculatePoincareMetrics(rrIntervals) {
    const n = rrIntervals.length;
    if (n < 3) return { sd1: 20, sd2: 50 };
    
    // Calculate SD1 and SD2
    let sumDiff = 0;
    let sumSum = 0;
    
    for (let i = 0; i < n - 1; i++) {
        const diff = rrIntervals[i+1] - rrIntervals[i];
        const sum = rrIntervals[i+1] + rrIntervals[i];
        sumDiff += diff * diff;
        sumSum += sum * sum;
    }
    
    const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / n;
    
    // SD1 = SDSD / sqrt(2) - short-term variability
    const sd1 = Math.sqrt(sumDiff / (2 * (n - 1)));
    
    // SD2 = sqrt(2*SDNN^2 - SD1^2) - long-term variability
    let sdnnSq = 0;
    for (let i = 0; i < n; i++) {
        sdnnSq += Math.pow(rrIntervals[i] - meanRR, 2);
    }
    sdnnSq /= (n - 1);
    
    const sd2 = Math.sqrt(2 * sdnnSq - sd1 * sd1);
    
    return { sd1, sd2: Math.abs(sd2) };
}

function updateTimeDomainAnalysis() {
    if (!state.analysisData) {
        state.analysisData = calculateHRVMetrics(state.rrIntervals);
    }
    
    const metrics = state.analysisData;
    
    // Update metric values - fixed selectors
    const sdnnEl = document.getElementById('sdnn-value');
    const rmssdEl = document.getElementById('rmssd-value');
    const pnn50El = document.getElementById('pnn50-value');
    const meanhrEl = document.getElementById('meanhr-value');
    
    if (sdnnEl) sdnnEl.textContent = metrics.sdnn + ' ms';
    if (rmssdEl) rmssdEl.textContent = metrics.rmssd + ' ms';
    if (pnn50El) pnn50El.textContent = metrics.pnn50 + '%';
    if (meanhrEl) meanhrEl.textContent = metrics.meanHR + ' bpm';
    
    // Draw histogram
    drawRRHistogram();
}

function drawRRHistogram() {
    const canvas = document.getElementById('histogram-canvas');
    if (!canvas || !state.rrIntervals?.length) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate histogram bins
    const data = state.rrIntervals;
    const minRR = Math.min(...data);
    const maxRR = Math.max(...data);
    const binCount = 20;
    const binWidth = (maxRR - minRR) / binCount;
    
    const bins = new Array(binCount).fill(0);
    data.forEach(rr => {
        const binIndex = Math.min(Math.floor((rr - minRR) / binWidth), binCount - 1);
        bins[binIndex]++;
    });
    
    const maxBin = Math.max(...bins);
    
    // Draw bars
    const barWidth = (width - 60) / binCount;
    const plotHeight = height - 50;
    
    bins.forEach((count, i) => {
        const barHeight = (count / maxBin) * plotHeight;
        const x = 40 + i * barWidth;
        const y = height - 30 - barHeight;
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
    
    // Draw axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, height - 30);
    ctx.lineTo(width - 10, height - 30);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RR Intervals (ms)', width / 2, height - 5);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();
}

function updateFrequencyDomainAnalysis() {
    if (!state.analysisData) {
        state.analysisData = calculateHRVMetrics(state.rrIntervals);
    }
    
    const metrics = state.analysisData;
    
    // Update frequency metrics
    const lfEl = document.getElementById('lf-value');
    const hfEl = document.getElementById('hf-value');
    const ratioEl = document.getElementById('ratio-value');
    
    if (lfEl) lfEl.textContent = metrics.lf + ' ms²';
    if (hfEl) hfEl.textContent = metrics.hf + ' ms²';
    if (ratioEl) ratioEl.textContent = metrics.lfhfRatio;
    
    // Draw spectrum
    drawFrequencySpectrum();
}

function drawFrequencySpectrum() {
    const canvas = document.getElementById('spectrum-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a2332';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw frequency bands
    const lfStart = width * 0.1;
    const lfEnd = width * 0.375;
    const hfStart = lfEnd;
    const hfEnd = width * 0.9;
    
    // VLF band (very low)
    ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.fillRect(0, 0, lfStart, height);
    
    // LF band
    ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
    ctx.fillRect(lfStart, 0, lfEnd - lfStart, height);
    
    // HF band
    ctx.fillStyle = 'rgba(39, 174, 96, 0.2)';
    ctx.fillRect(hfStart, 0, hfEnd - hfStart, height);
    
    // Draw simulated spectrum curve
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const metrics = state.analysisData || getDefaultMetrics();
    const lfPeak = height - (metrics.lf / 1500 * height * 0.6) - 20;
    const hfPeak = height - (metrics.hf / 1500 * height * 0.6) - 20;
    
    ctx.moveTo(0, height - 20);
    ctx.quadraticCurveTo(lfStart * 0.5, height - 30, lfStart, height - 25);
    ctx.quadraticCurveTo((lfStart + lfEnd) / 2, lfPeak, lfEnd, height - 30);
    ctx.quadraticCurveTo((hfStart + hfEnd) / 2, hfPeak, hfEnd, height - 25);
    ctx.quadraticCurveTo(width * 0.95, height - 20, width, height - 20);
    
    ctx.stroke();
    
    // Fill under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
}

function updateNonlinearAnalysis() {
    if (!state.analysisData) {
        state.analysisData = calculateHRVMetrics(state.rrIntervals);
    }
    
    const metrics = state.analysisData;
    
    // Update SD1, SD2 values
    const sd1El = document.getElementById('sd1-value');
    const sd2El = document.getElementById('sd2-value');
    const ratioEl = document.getElementById('sd-ratio-value');
    
    if (sd1El) sd1El.textContent = metrics.sd1 + ' ms';
    if (sd2El) sd2El.textContent = metrics.sd2 + ' ms';
    if (ratioEl) ratioEl.textContent = (metrics.sd2 / metrics.sd1).toFixed(2);
    
    // Draw Poincaré plot
    drawPoincarePlot();
}

function drawPoincarePlot() {
    const canvas = document.getElementById('poincare-canvas');
    if (!canvas || !state.rrIntervals?.length) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    const data = state.rrIntervals;
    const padding = 50;
    
    // Calculate plot bounds
    const minRR = Math.min(...data) - 50;
    const maxRR = Math.max(...data) + 50;
    const range = maxRR - minRR;
    
    // Draw grid and axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Draw identity line
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, padding);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw axes
    ctx.strokeStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Plot points
    ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
    for (let i = 0; i < data.length - 1; i++) {
        const x = padding + ((data[i] - minRR) / range) * (width - 2 * padding);
        const y = height - padding - ((data[i+1] - minRR) / range) * (height - 2 * padding);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RRn (ms)', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('RRn+1 (ms)', 0, 0);
    ctx.restore();
}

/* =========================================
   Clinical Step
   ========================================= */
function updateResultsSummary() {
    if (!state.analysisData || !state.recordedData) {
        const noDataEl = document.querySelector('#results-summary .no-data');
        if (noDataEl) noDataEl.classList.remove('hidden');
        return;
    }
    
    const metrics = state.analysisData;
    const condition = state.recordedData.condition;
    
    // Update summary content
    const summaryContent = document.querySelector('.summary-content');
    if (summaryContent) {
        summaryContent.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Recording Condition:</span>
                    <span class="value">${condition.charAt(0).toUpperCase() + condition.slice(1)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Mean Heart Rate:</span>
                    <span class="value">${metrics.meanHR} bpm</span>
                </div>
                <div class="summary-item">
                    <span class="label">SDNN:</span>
                    <span class="value">${metrics.sdnn} ms</span>
                </div>
                <div class="summary-item">
                    <span class="label">RMSSD:</span>
                    <span class="value">${metrics.rmssd} ms</span>
                </div>
                <div class="summary-item">
                    <span class="label">LF/HF Ratio:</span>
                    <span class="value">${metrics.lfhfRatio}</span>
                </div>
            </div>
        `;
    }
}

/* =========================================
   Glossary Modal
   ========================================= */
function setupGlossary() {
    const btnGlossary = document.getElementById('btn-glossary');
    const modal = document.getElementById('glossary-modal');
    const closeBtn = document.getElementById('close-glossary');
    const searchInput = document.getElementById('glossary-search');
    
    if (btnGlossary) {
        btnGlossary.addEventListener('click', () => openGlossary());
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGlossary);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGlossary();
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterGlossary(e.target.value);
        });
    }
}

function openGlossary() {
    const modal = document.getElementById('glossary-modal');
    if (modal) {
        modal.classList.remove('hidden');
        populateGlossary();
    }
}

function closeGlossary() {
    const modal = document.getElementById('glossary-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function populateGlossary(filter = '') {
    const list = document.getElementById('glossary-list');
    if (!list) return;
    
    const filteredTerms = filter 
        ? glossaryTerms.filter(t => 
            t.term.toLowerCase().includes(filter.toLowerCase()) ||
            t.definition.toLowerCase().includes(filter.toLowerCase())
          )
        : glossaryTerms;
    
    list.innerHTML = filteredTerms.map(t => `
        <div class="glossary-item">
            <h4>${t.term}</h4>
            <p>${t.definition}</p>
        </div>
    `).join('');
}

function filterGlossary(searchTerm) {
    populateGlossary(searchTerm);
}

/* =========================================
   Canvas Initialization
   ========================================= */
function initializeCanvases() {
    // Set canvas dimensions
    const canvases = {
        'welcome-ecg-canvas': { width: 700, height: 200 },
        'sns-ecg-canvas': { width: 280, height: 100 },
        'pns-ecg-canvas': { width: 280, height: 100 },
        'ecg-canvas': { width: 800, height: 250 },
        'tachogram-canvas': { width: 700, height: 200 },
        'histogram-canvas': { width: 600, height: 250 },
        'spectrum-canvas': { width: 700, height: 200 },
        'poincare-canvas': { width: 400, height: 400 }
    };
    
    Object.entries(canvases).forEach(([id, dims]) => {
        const canvas = document.getElementById(id);
        if (canvas) {
            canvas.width = dims.width;
            canvas.height = dims.height;
        }
    });
}

/* =========================================
   Utility Functions
   ========================================= */
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Initialize on load
console.log('HRV Virtual Lab script loaded');
