/* =========================================
   HRV Signal Engine — ECG & RR Interval Generator
   ========================================= */

class HRVSignalEngine {
    constructor() {
        // Default parameters
        this.sampleRate = 500; // Hz
        this.time = 0;
        
        // Condition-specific parameters
        this.conditions = {
            relaxed: {
                baseHR: 65,           // Base heart rate (bpm)
                hrVariability: 15,    // HR variability range (bpm)
                rrMean: 923,          // Mean RR interval (ms)
                rrSD: 60,             // RR standard deviation (ms)
                lfPower: 0.4,         // LF component strength
                hfPower: 0.6,         // HF component strength (PNS dominant)
                respiratoryRate: 12,  // Breaths per minute
                description: 'Resting state with parasympathetic dominance'
            },
            stressed: {
                baseHR: 90,
                hrVariability: 8,
                rrMean: 667,
                rrSD: 25,
                lfPower: 0.7,         // SNS dominant
                hfPower: 0.3,
                respiratoryRate: 18,
                description: 'Stress response with sympathetic activation'
            },
            exercise: {
                baseHR: 140,
                hrVariability: 5,
                rrMean: 429,
                rrSD: 15,
                lfPower: 0.85,
                hfPower: 0.15,
                respiratoryRate: 30,
                description: 'Physical exertion with high SNS activity'
            },
            pathological: {
                baseHR: 78,
                hrVariability: 3,
                rrMean: 769,
                rrSD: 12,
                lfPower: 0.5,
                hfPower: 0.2,
                respiratoryRate: 16,
                description: 'Reduced HRV indicating autonomic dysfunction'
            }
        };
        
        // Current condition
        this.condition = 'relaxed';
        this.params = this.conditions[this.condition];
        
        // Signal state
        this.currentRR = this.params.rrMean;
        this.currentHR = this.params.baseHR;
        this.phase = 0;
        this.breathPhase = 0;
        
        // RR interval buffer for smooth transitions
        this.rrBuffer = [];
        this.bufferSize = 10;
        
        // Initialize buffer
        for (let i = 0; i < this.bufferSize; i++) {
            this.rrBuffer.push(this.generateRRInterval());
        }
    }
    
    /* =========================================
       Configuration
       ========================================= */
    setCondition(condition) {
        if (this.conditions[condition]) {
            this.condition = condition;
            this.params = this.conditions[condition];
            
            // Smooth transition
            this.transitionToNewCondition();
        }
    }
    
    transitionToNewCondition() {
        // Gradually shift RR buffer towards new condition
        const targetRR = this.params.rrMean;
        const transitionSteps = 5;
        
        for (let i = 0; i < transitionSteps; i++) {
            const ratio = (i + 1) / transitionSteps;
            const transitionRR = this.currentRR + (targetRR - this.currentRR) * ratio;
            this.rrBuffer.push(transitionRR + (Math.random() - 0.5) * this.params.rrSD);
            this.rrBuffer.shift();
        }
        
        this.currentRR = targetRR;
        this.currentHR = Math.round(60000 / targetRR);
    }
    
    /* =========================================
       Signal Generation
       ========================================= */
    generateSignal(length) {
        const signal = new Array(length);
        const samplesPerBeat = Math.round(this.sampleRate * (this.currentRR / 1000));
        
        for (let i = 0; i < length; i++) {
            // Calculate phase within current beat
            const beatPhase = (this.phase % samplesPerBeat) / samplesPerBeat;
            
            // Generate ECG waveform
            signal[i] = this.generateECGPoint(beatPhase);
            
            // Add noise based on condition
            signal[i] += this.generateNoise();
            
            // Update phase
            this.phase++;
            
            // Check for new beat
            if (this.phase % samplesPerBeat === 0) {
                this.updateRRInterval();
            }
        }
        
        return signal;
    }
    
    generateECGPoint(phase) {
        // Simplified PQRST complex model
        let value = 0;
        
        // P wave (atrial depolarization) - 0.0 to 0.1
        if (phase >= 0 && phase < 0.1) {
            const pPhase = phase / 0.1;
            value = 0.12 * Math.sin(pPhase * Math.PI);
        }
        // PR segment - 0.1 to 0.15
        else if (phase >= 0.1 && phase < 0.15) {
            value = 0;
        }
        // Q wave - 0.15 to 0.18
        else if (phase >= 0.15 && phase < 0.18) {
            const qPhase = (phase - 0.15) / 0.03;
            value = -0.08 * Math.sin(qPhase * Math.PI);
        }
        // R wave (ventricular depolarization peak) - 0.18 to 0.24
        else if (phase >= 0.18 && phase < 0.24) {
            const rPhase = (phase - 0.18) / 0.06;
            if (rPhase < 0.5) {
                value = rPhase * 2; // Rising edge
            } else {
                value = 1 - (rPhase - 0.5) * 2; // Falling edge
            }
        }
        // S wave - 0.24 to 0.28
        else if (phase >= 0.24 && phase < 0.28) {
            const sPhase = (phase - 0.24) / 0.04;
            value = -0.15 * Math.sin(sPhase * Math.PI);
        }
        // ST segment - 0.28 to 0.36
        else if (phase >= 0.28 && phase < 0.36) {
            value = 0;
        }
        // T wave (ventricular repolarization) - 0.36 to 0.52
        else if (phase >= 0.36 && phase < 0.52) {
            const tPhase = (phase - 0.36) / 0.16;
            value = 0.25 * Math.sin(tPhase * Math.PI);
        }
        // Baseline - 0.52 to 1.0
        else {
            value = 0;
        }
        
        // Add respiratory modulation (RSA)
        const rsaModulation = this.getRespiratoryModulation();
        value *= (1 + rsaModulation * 0.05);
        
        return value;
    }
    
    generateNoise() {
        // Baseline noise
        let noise = (Math.random() - 0.5) * 0.02;
        
        // Add condition-specific noise
        if (this.condition === 'exercise') {
            // More motion artifact during exercise
            noise += (Math.random() - 0.5) * 0.03;
        } else if (this.condition === 'pathological') {
            // Irregular baseline in pathological states
            noise += Math.sin(this.phase * 0.01) * 0.01;
        }
        
        return noise;
    }
    
    getRespiratoryModulation() {
        // Respiratory sinus arrhythmia - heart rate varies with breathing
        const breathCycleLength = (60 / this.params.respiratoryRate) * this.sampleRate;
        this.breathPhase = (this.breathPhase + 1) % breathCycleLength;
        
        // Sinusoidal respiratory modulation
        return Math.sin(2 * Math.PI * this.breathPhase / breathCycleLength);
    }
    
    /* =========================================
       RR Interval Generation
       ========================================= */
    generateRRInterval() {
        const params = this.params;
        
        // Base RR interval
        let rr = params.rrMean;
        
        // Add LF component (0.04-0.15 Hz) - slower oscillations
        const lfOscillation = this.generateLFComponent() * params.rrSD * params.lfPower;
        
        // Add HF component (0.15-0.4 Hz) - respiratory-linked
        const hfOscillation = this.generateHFComponent() * params.rrSD * params.hfPower;
        
        // Add random variability
        const randomVariation = (Math.random() - 0.5) * params.rrSD * 0.5;
        
        // Combine components
        rr += lfOscillation + hfOscillation + randomVariation;
        
        // Ensure physiologically reasonable bounds
        const minRR = 300;  // Max HR ~200 bpm
        const maxRR = 2000; // Min HR ~30 bpm
        rr = Math.max(minRR, Math.min(maxRR, rr));
        
        return Math.round(rr);
    }
    
    generateLFComponent() {
        // Low frequency oscillation (~0.1 Hz)
        const lfFreq = 0.1; // Hz
        const lfPhase = Date.now() * 0.001 * lfFreq * 2 * Math.PI;
        return Math.sin(lfPhase) * 0.8 + Math.sin(lfPhase * 0.7) * 0.2;
    }
    
    generateHFComponent() {
        // High frequency oscillation (respiratory rate)
        const hfFreq = this.params.respiratoryRate / 60; // Hz
        const hfPhase = Date.now() * 0.001 * hfFreq * 2 * Math.PI;
        return Math.sin(hfPhase);
    }
    
    updateRRInterval() {
        // Generate new RR interval and update buffer
        const newRR = this.generateRRInterval();
        this.rrBuffer.push(newRR);
        this.rrBuffer.shift();
        
        // Update current RR (smooth average)
        this.currentRR = this.rrBuffer.reduce((a, b) => a + b, 0) / this.rrBuffer.length;
        this.currentHR = Math.round(60000 / this.currentRR);
    }
    
    /* =========================================
       Data Access Methods
       ========================================= */
    getCurrentHeartRate() {
        // Add small random variation for realism
        const variation = (Math.random() - 0.5) * 2;
        return Math.round(this.currentHR + variation);
    }
    
    getCurrentRRInterval() {
        return Math.round(this.currentRR);
    }
    
    generateRRSeries(count) {
        // Generate a series of RR intervals for analysis
        const series = [];
        const baseRR = this.params.rrMean;
        const sd = this.params.rrSD;
        
        // Initialize with some correlation
        let prevRR = baseRR;
        
        for (let i = 0; i < count; i++) {
            // AR(1) model with physiological constraints
            const ar1Coef = 0.8; // Auto-correlation coefficient
            const innovation = this.generateInnovation();
            
            let newRR = baseRR + ar1Coef * (prevRR - baseRR) + innovation * sd;
            
            // Add respiratory modulation
            const breathEffect = Math.sin(2 * Math.PI * i / (60 / this.params.respiratoryRate * 2)) * sd * 0.3;
            newRR += breathEffect;
            
            // Bound check
            newRR = Math.max(400, Math.min(1500, newRR));
            
            series.push(Math.round(newRR));
            prevRR = newRR;
        }
        
        return series;
    }
    
    generateInnovation() {
        // Generate normally distributed random number (Box-Muller transform)
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    
    /* =========================================
       Analysis Support
       ========================================= */
    getConditionParameters() {
        return { ...this.params };
    }
    
    getExpectedMetrics() {
        // Return expected HRV metrics for current condition
        const params = this.params;
        
        return {
            expectedSDNN: params.rrSD,
            expectedRMSSD: params.rrSD * (params.hfPower / (params.lfPower + params.hfPower)),
            expectedLF: Math.round(params.lfPower * 1000),
            expectedHF: Math.round(params.hfPower * 1000),
            expectedLFHFRatio: (params.lfPower / params.hfPower).toFixed(2),
            autonomicBalance: params.lfPower > params.hfPower ? 'Sympathetic' : 'Parasympathetic'
        };
    }
    
    /* =========================================
       R-Peak Detection Simulation
       ========================================= */
    detectRPeaks(signal, threshold = 0.6) {
        // Simple peak detection for R-wave identification
        const peaks = [];
        const minDistance = Math.round(this.sampleRate * 0.3); // Min 300ms between beats
        
        let lastPeak = -minDistance;
        
        for (let i = 1; i < signal.length - 1; i++) {
            if (signal[i] > threshold &&
                signal[i] > signal[i-1] &&
                signal[i] > signal[i+1] &&
                (i - lastPeak) > minDistance) {
                peaks.push(i);
                lastPeak = i;
            }
        }
        
        return peaks;
    }
    
    peaksToRRIntervals(peaks) {
        // Convert peak indices to RR intervals
        const rrIntervals = [];
        
        for (let i = 1; i < peaks.length; i++) {
            const interval = (peaks[i] - peaks[i-1]) / this.sampleRate * 1000;
            rrIntervals.push(Math.round(interval));
        }
        
        return rrIntervals;
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HRVSignalEngine;
}

console.log('HRVSignalEngine loaded');
