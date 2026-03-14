/* =====================================================
   Quiz Module — Pre-test, Post-test, Popup Questions,
   Flashcard Viewer for Virtual Lab experiments
   ===================================================== */
(function (window) {
    'use strict';

    function resolveApiBaseUrl() {
        const configuredBaseUrl =
            window.LAB_API_BASE_URL ||
            window.labAPI?.baseURL ||
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

    const API_BASE = resolveApiBaseUrl();

    // ─────────────────────────────────────────────────
    // Inject CSS once
    // ─────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('quiz-module-styles')) return;
        const style = document.createElement('style');
        style.id = 'quiz-module-styles';
        style.textContent = `
/* ── Quiz Overlay ────────────────────────────────── */
.qm-overlay {
    position: fixed; inset: 0;
    background: rgba(10,20,40,.85);
    backdrop-filter: blur(6px);
    z-index: 9000;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity .3s;
}
.qm-overlay.qm-visible { opacity: 1; }

.qm-modal {
    background: #0f1e35;
    border: 1px solid rgba(74,144,164,.35);
    border-radius: 16px;
    width: min(680px, 95vw);
    max-height: 90vh;
    display: flex; flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,.6);
    transform: translateY(24px);
    transition: transform .3s;
}
.qm-overlay.qm-visible .qm-modal { transform: translateY(0); }

.qm-header {
    padding: 22px 28px 16px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    display: flex; align-items: center; gap: 12px;
}
.qm-header-icon {
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; flex-shrink: 0;
}
.qm-header-icon.pre  { background: rgba(59,130,246,.2); color: #60a5fa; }
.qm-header-icon.post { background: rgba(16,185,129,.2); color: #34d399; }
.qm-header-icon.popup{ background: rgba(245,158,11,.2); color: #fbbf24; }
.qm-header-icon.flash{ background: rgba(168,85,247,.2); color: #c084fc; }

.qm-header-title { flex: 1; }
.qm-header-title h3 { color: #e2e8f0; font-size: 1.1rem; margin: 0 0 2px; }
.qm-header-title p  { color: #7a8fa6; font-size: .82rem; margin: 0; }
.qm-header-close {
    background: none; border: none;
    color: #7a8fa6; font-size: 1.25rem;
    cursor: pointer; padding: 4px; border-radius: 6px;
    transition: color .2s, background .2s;
}
.qm-header-close:hover { color: #e2e8f0; background: rgba(255,255,255,.07); }

.qm-body { padding: 24px 28px; overflow-y: auto; flex: 1; }

/* Progress bar */
.qm-progress-bar {
    height: 4px; background: rgba(255,255,255,.08);
    border-radius: 2px; margin-bottom: 20px; overflow: hidden;
}
.qm-progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, #4a90a4, #22d3ee);
    transition: width .4s ease;
}
.qm-progress-label {
    text-align: right; font-size: .75rem; color: #7a8fa6;
    margin-top: -16px; margin-bottom: 14px;
}

/* Question card */
.qm-question-text {
    color: #e2e8f0; font-size: 1rem; line-height: 1.6;
    margin-bottom: 20px; font-weight: 500;
}
.qm-difficulty {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 10px; border-radius: 99px;
    font-size: .72rem; font-weight: 600; letter-spacing: .04em;
    margin-bottom: 14px; text-transform: uppercase;
}
.qm-difficulty.basic    { background: rgba(16,185,129,.15); color: #34d399; }
.qm-difficulty.medium   { background: rgba(245,158,11,.15); color: #fbbf24; }
.qm-difficulty.advanced { background: rgba(239,68,68,.15);  color: #f87171; }

/* Options */
.qm-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.qm-option {
    padding: 14px 18px; border-radius: 10px;
    border: 1.5px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.04);
    color: #c4d3e0; font-size: .92rem; cursor: pointer;
    transition: border-color .2s, background .2s, color .2s;
    display: flex; align-items: flex-start; gap: 12px;
}
.qm-option:hover:not(.qm-answered) {
    border-color: rgba(74,144,164,.6);
    background: rgba(74,144,164,.1); color: #e2e8f0;
}
.qm-option.selected { border-color: #4a90a4; background: rgba(74,144,164,.15); color: #e2e8f0; }
.qm-option.correct  { border-color: #10b981; background: rgba(16,185,129,.12); color: #ecfdf5; }
.qm-option.wrong    { border-color: #ef4444; background: rgba(239,68,68,.12);  color: #fef2f2; }
.qm-option-label {
    width: 22px; height: 22px; border-radius: 50%;
    border: 1.5px solid currentColor; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: .7rem; font-weight: 700; margin-top: 1px;
}
.qm-option-text { flex: 1; line-height: 1.5; }

/* Feedback */
.qm-feedback {
    border-radius: 10px; padding: 12px 16px;
    font-size: .88rem; line-height: 1.55;
    margin-bottom: 16px; display: none;
}
.qm-feedback.correct { background: rgba(16,185,129,.12); color: #86efac; border: 1px solid rgba(16,185,129,.25); }
.qm-feedback.wrong   { background: rgba(239,68,68,.10); color: #fca5a5; border: 1px solid rgba(239,68,68,.25); }
.qm-explanation {
    background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
    border-radius: 10px; padding: 12px 16px;
    font-size: .86rem; color: #a5b4fc; line-height: 1.55;
    margin-bottom: 16px; display: none;
}

/* Buttons */
.qm-footer { padding: 16px 28px 22px; display: flex; gap: 12px; justify-content: flex-end; }
.qm-btn {
    padding: 10px 24px; border-radius: 8px; font-size: .9rem;
    font-weight: 600; cursor: pointer; border: none; transition: all .2s;
}
.qm-btn-primary {
    background: linear-gradient(135deg, #4a90a4, #2b7a8f);
    color: #fff;
}
.qm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(74,144,164,.4); }
.qm-btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.qm-btn-secondary {
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.1);
    color: #c4d3e0;
}
.qm-btn-secondary:hover { background: rgba(255,255,255,.12); color: #e2e8f0; }

/* Score screen */
.qm-score-screen { text-align: center; padding: 10px 0; }
.qm-score-circle {
    width: 110px; height: 110px; border-radius: 50%;
    border: 5px solid;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    margin: 0 auto 20px;
    position: relative;
}
.qm-score-circle.excellent { border-color: #10b981; }
.qm-score-circle.good      { border-color: #3b82f6; }
.qm-score-circle.fair      { border-color: #f59e0b; }
.qm-score-circle.poor      { border-color: #ef4444; }
.qm-score-number { font-size: 2rem; font-weight: 700; color: #e2e8f0; line-height: 1; }
.qm-score-label  { font-size: .72rem; color: #7a8fa6; }
.qm-score-title  { font-size: 1.3rem; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; }
.qm-score-desc   { color: #7a8fa6; font-size: .88rem; margin-bottom: 20px; }
.qm-score-comparison {
    background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.2);
    border-radius: 10px; padding: 14px 20px;
    display: flex; align-items: center; justify-content: space-around;
    gap: 12px; margin-bottom: 20px;
}
.qm-score-stat { text-align: center; }
.qm-score-stat .stat-val { font-size: 1.5rem; font-weight: 700; color: #e2e8f0; }
.qm-score-stat .stat-lbl { font-size: .72rem; color: #7a8fa6; }
.qm-improvement {
    font-size: .88rem; color: #86efac;
    background: rgba(16,185,129,.08); border-radius: 8px;
    padding: 8px 14px; margin-bottom: 16px;
}
.qm-improvement.negative { color: #fca5a5; background: rgba(239,68,68,.08); }

/* Flashcard specific */
.qm-fc-deck {
    position: relative; width: 100%; padding-top: 56%;
    perspective: 1000px; margin-bottom: 16px;
}
.qm-fc-inner {
    position: absolute; inset: 0;
    transform-style: preserve-3d;
    transition: transform .55s ease;
    cursor: pointer;
}
.qm-fc-inner.flipped { transform: rotateY(180deg); }
.qm-fc-front, .qm-fc-back {
    position: absolute; inset: 0;
    border-radius: 14px; padding: 28px 32px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    backface-visibility: hidden;
}
.qm-fc-front {
    background: linear-gradient(135deg, #1a2c45, #0f1e35);
    border: 1.5px solid rgba(74,144,164,.3);
}
.qm-fc-back {
    background: linear-gradient(135deg, #1a2c45, #13243a);
    border: 1.5px solid rgba(168,85,247,.3);
    transform: rotateY(180deg);
}
.qm-fc-label {
    font-size: .7rem; letter-spacing: .1em; text-transform: uppercase;
    font-weight: 700; margin-bottom: 14px;
}
.qm-fc-front .qm-fc-label { color: #4a90a4; }
.qm-fc-back .qm-fc-label   { color: #c084fc; }
.qm-fc-term { font-size: 1.3rem; font-weight: 700; color: #e2e8f0; line-height: 1.3; }
.qm-fc-def  { font-size: .9rem; color: #cbd5e1; line-height: 1.6; }
.qm-fc-hint { font-size: .75rem; color: #4a90a4; margin-top: 14px; }

.qm-fc-nav {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.qm-fc-counter { color: #7a8fa6; font-size: .85rem; }
.qm-fc-tip { text-align: center; color: #4a90a4; font-size: .78rem; margin-top: 10px; }

/* Popup question badge */
.qm-popup-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.3);
    color: #fbbf24; padding: 4px 12px; border-radius: 99px;
    font-size: .75rem; font-weight: 600; margin-bottom: 18px;
}
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────
    // API helpers
    // ─────────────────────────────────────────────────
    async function fetchQuestions(experimentKey) {
        try {
            const resp = await fetch(`${API_BASE}/lab/content/${encodeURIComponent(experimentKey)}/questions`);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            return data.questions || [];
        } catch (e) {
            console.warn('[QuizModule] Questions fetch failed, using fallback.', e.message);
            return getFallbackQuestions(experimentKey);
        }
    }

    async function fetchFlashcards(experimentKey) {
        try {
            const resp = await fetch(`${API_BASE}/lab/content/${encodeURIComponent(experimentKey)}/flashcards`);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            return data.flashcards || [];
        } catch (e) {
            console.warn('[QuizModule] Flashcards fetch failed, using fallback.', e.message);
            return getFallbackFlashcards(experimentKey);
        }
    }

    async function persistAssessment(experimentKey, assessmentType, result) {
        try {
            if (!result || !window.labAPI || typeof window.labAPI.submitAssessment !== 'function') {
                return;
            }

            const attempts = Array.isArray(result.answers)
                ? result.answers.map((item) => ({
                      question_id: item.questionId || null,
                      selected_label: item.selectedLabel || null,
                      correct: Boolean(item.correct),
                      attempt_number: 1
                  }))
                : [];

            await window.labAPI.submitAssessment({
                experiment_key: experimentKey,
                assessment_type: assessmentType,
                score: result.score,
                total: result.total,
                pct: result.pct,
                time_spent_seconds: result.timeSpentSeconds || 0,
                attempts
            });
        } catch (error) {
            // Assessment persistence should not block lab UX.
            console.warn('[QuizModule] Assessment persistence failed:', error?.message || error);
        }
    }

    // ─────────────────────────────────────────────────
    // Fallback question data (matches experiment-content.js)
    // ─────────────────────────────────────────────────
    function getFallbackQuestions(key) {
        const emg = [
            {
                id: 1, question_text: 'What happens to EMG amplitude as muscle force increases?',
                difficulty_level: 'basic', is_pretest_eligible: true, is_posttest_eligible: true, is_popup_question: false,
                explanation: 'More motor units are recruited and existing units fire faster, increasing the overall amplitude of the surface EMG signal.',
                options: [
                    { option_label: 'A', option_text: 'Amplitude decreases', is_correct: false, feedback: 'Incorrect. Greater force recruits more motor units.' },
                    { option_label: 'B', option_text: 'Amplitude increases due to more motor unit recruitment', is_correct: true,  feedback: 'Correct! More motor units fire = higher amplitude signal.' },
                    { option_label: 'C', option_text: 'Amplitude stays constant', is_correct: false, feedback: 'Incorrect. Force production linearly increases EMG amplitude.' },
                    { option_label: 'D', option_text: 'Amplitude becomes zero', is_correct: false, feedback: 'Incorrect. Zero amplitude would indicate no muscle activity.' }
                ]
            },
            {
                id: 2, question_text: 'Why is skin preparation (cleaning and abrasion) important before placing EMG electrodes?',
                difficulty_level: 'basic', is_pretest_eligible: true, is_posttest_eligible: false, is_popup_question: false,
                explanation: 'The skin\'s outer layer (stratum corneum) has high resistive impedance. Proper preparation reduces this to <5 kΩ, greatly improving signal quality and SNR.',
                options: [
                    { option_label: 'A', option_text: 'To improve electrode adhesion only', is_correct: false, feedback: 'Adhesion is a minor benefit, the main reason is electrical.' },
                    { option_label: 'B', option_text: 'To reduce electrode-skin impedance and improve SNR', is_correct: true,  feedback: 'Correct! Lower impedance means higher quality, lower-noise EMG signal.' },
                    { option_label: 'C', option_text: 'To sterilise the skin surface', is_correct: false, feedback: 'Sterility is secondary; the primary goal is impedance reduction.' },
                    { option_label: 'D', option_text: 'No particular reason; it is optional', is_correct: false, feedback: 'Incorrect. Skipping prep can make signals uninterpretable.' }
                ]
            },
            {
                id: 3, question_text: 'Main purpose of checking the EMG baseline (before contraction)?',
                difficulty_level: 'medium', is_pretest_eligible: false, is_posttest_eligible: true, is_popup_question: false,
                explanation: 'A flat, low-noise baseline confirms that the electrode-skin interface is good and that no interference is contaminating the signal before muscle activation begins.',
                options: [
                    { option_label: 'A', option_text: 'To calibrate the gain automatically', is_correct: false, feedback: 'Gain is set separately during calibration.' },
                    { option_label: 'B', option_text: 'To confirm no signal is present at rest (good electrode contact)', is_correct: true,  feedback: 'Correct! A stable, near-zero baseline = good electrode placement.' },
                    { option_label: 'C', option_text: 'To warm up the muscle for recording', is_correct: false, feedback: 'Muscles are not "warmed up" by EMG baseline checking.' },
                    { option_label: 'D', option_text: 'To record background noise for subtraction', is_correct: false, feedback: 'Noise subtraction is handled by the differential amplifier, not baseline.' }
                ]
            },
            {
                id: 4, question_text: 'You notice a large, unstable EMG baseline before asking the subject to contract. What should you do first?',
                difficulty_level: 'advanced', is_pretest_eligible: false, is_posttest_eligible: false, is_popup_question: true,
                explanation: 'An unstable baseline almost always indicates electrode-skin impedance problems. Recheck placement and skin preparation before any signal interpretation.',
                options: [
                    { option_label: 'A', option_text: 'Increase the gain to compensate', is_correct: false, feedback: 'Higher gain will only amplify the noise further.' },
                    { option_label: 'B', option_text: 'Recheck electrode placement and skin preparation', is_correct: true,  feedback: 'Correct! Poor prep is the most common cause of unstable baselines.' },
                    { option_label: 'C', option_text: 'Proceed with recording and correct it in software', is_correct: false, feedback: 'Post-hoc correction cannot recover a badly noisy signal.' },
                    { option_label: 'D', option_text: 'Switch off the notch filter', is_correct: false, feedback: 'The notch filter removes 50/60 Hz mains noise, not general instability.' }
                ]
            },
            {
                id: 5, question_text: 'What is the safest conclusion when EMG amplitude appears very weak during poorly prepared electrode placement?',
                difficulty_level: 'advanced', is_pretest_eligible: false, is_posttest_eligible: true, is_popup_question: false,
                explanation: 'High electrode-skin impedance attenuates the signal significantly. Always ensure good skin preparation before drawing any clinical or physiological conclusions.',
                options: [
                    { option_label: 'A', option_text: 'The muscle is genuinely weak and needs investigation', is_correct: false, feedback: 'Incorrect – you cannot conclude pathology before ruling out technical causes.' },
                    { option_label: 'B', option_text: 'The signal is attenuated by high impedance; re-prep and repeat', is_correct: true,  feedback: 'Correct! Technical cause must be excluded before any clinical conclusion.' },
                    { option_label: 'C', option_text: 'The gain is set too low', is_correct: false, feedback: 'Gain alone would not affect whether preparation is adequate.' },
                    { option_label: 'D', option_text: 'The muscle is not being targeted', is_correct: false, feedback: 'Placement accuracy is a separate concern from preparation quality.' }
                ]
            }
        ];

        const hrv = [
            {
                id: 10, question_text: 'Which branch of the ANS is primarily responsible for increasing short-term HRV at rest?',
                difficulty_level: 'basic', is_pretest_eligible: true, is_posttest_eligible: true, is_popup_question: false,
                explanation: 'The parasympathetic nervous system (via vagal tone) produces beat-to-beat variations in heart rate, increasing overall HRV at rest.',
                options: [
                    { option_label: 'A', option_text: 'Sympathetic nervous system (SNS)', is_correct: false, feedback: 'SNS activation reduces HRV by increasing baseline heart rate.' },
                    { option_label: 'B', option_text: 'Parasympathetic nervous system (PNS)', is_correct: true,  feedback: 'Correct! Vagal (PNS) activity is the main driver of short-term HRV.' },
                    { option_label: 'C', option_text: 'Somatic nervous system', is_correct: false, feedback: 'The somatic system controls voluntary muscles, not heart rate.' },
                    { option_label: 'D', option_text: 'Enteric nervous system', is_correct: false, feedback: 'The enteric system governs the digestive tract, not cardiac rhythm.' }
                ]
            },
            {
                id: 11, question_text: 'Why is Lead II the preferred ECG lead configuration for HRV analysis?',
                difficulty_level: 'basic', is_pretest_eligible: true, is_posttest_eligible: false, is_popup_question: false,
                explanation: 'Lead II (Right Arm to Left Leg) runs closest to the cardiac axis, producing tall, upright, clearly defined R-peaks ideal for automated RR interval detection.',
                options: [
                    { option_label: 'A', option_text: 'It records from the fewest electrodes', is_correct: false, feedback: 'Lead II uses the standard 3-electrode setup, same as most configurations.' },
                    { option_label: 'B', option_text: 'It produces the clearest, most upright R-peaks for detection', is_correct: true,  feedback: 'Correct! Tall upright R-peaks minimise false detections in beat detection algorithms.' },
                    { option_label: 'C', option_text: 'It measures only sympathetic activity', is_correct: false, feedback: 'ECG leads measure the sum of cardiac electrical vectors, not ANS branches.' },
                    { option_label: 'D', option_text: 'It amplifies the signal more than other leads', is_correct: false, feedback: 'Amplification is a function of the recording system, not the lead choice.' }
                ]
            },
            {
                id: 12, question_text: 'Which HRV metric is most sensitive to short-term parasympathetic fluctuations?',
                difficulty_level: 'medium', is_pretest_eligible: false, is_posttest_eligible: true, is_popup_question: false,
                explanation: 'RMSSD (root mean square of successive differences) captures millisecond-to-millisecond beat-to-beat variability driven primarily by vagal (PNS) activity.',
                options: [
                    { option_label: 'A', option_text: 'SDNN', is_correct: false, feedback: 'SDNN captures overall HRV including long-term (sympathetic + parasympathetic) components.' },
                    { option_label: 'B', option_text: 'Mean HR', is_correct: false, feedback: 'Mean HR averages out the variations rather than reflecting them.' },
                    { option_label: 'C', option_text: 'RMSSD', is_correct: true,  feedback: 'Correct! RMSSD reflects rapid PNS-mediated beat-to-beat changes.' },
                    { option_label: 'D', option_text: 'LF power', is_correct: false, feedback: 'LF power reflects a mix of SNS and PNS, not primarily parasympathetic.' }
                ]
            },
            {
                id: 13, question_text: 'A learner observes low RMSSD and high LF/HF ratio after a mental arithmetic task. What is the most appropriate clinical interpretation?',
                difficulty_level: 'advanced', is_pretest_eligible: false, is_posttest_eligible: false, is_popup_question: true,
                explanation: 'Low RMSSD indicates reduced parasympathetic activity, and elevated LF/HF points to sympathetic dominance — both consistent with psychological stress. This is the expected pattern during a cognitive stressor.',
                options: [
                    { option_label: 'A', option_text: 'The subject has a cardiac condition requiring investigation', is_correct: false, feedback: 'A single acute task result is not sufficient to conclude cardiac pathology.' },
                    { option_label: 'B', option_text: 'Sympathetic dominance consistent with mental stress', is_correct: true,  feedback: 'Correct! These HRV signatures are the expected response to cognitive stress.' },
                    { option_label: 'C', option_text: 'High parasympathetic activity during relaxation', is_correct: false, feedback: 'High RMSSD and low LF/HF would indicate parasympathetic dominance, not low RMSSD.' },
                    { option_label: 'D', option_text: 'The recording is corrupted by motion artifact', is_correct: false, feedback: 'The pattern is internally consistent with a physiological response, not artifact.' }
                ]
            },
            {
                id: 14, question_text: 'Increased HF power during slow, controlled breathing is most defensibly interpreted as:',
                difficulty_level: 'advanced', is_pretest_eligible: false, is_posttest_eligible: true, is_popup_question: false,
                explanation: 'Slow paced breathing entrains respiratory sinus arrhythmia (RSA) into the HF band, amplifying HF power. This reflects enhanced vagal tone, not a confound.',
                options: [
                    { option_label: 'A', option_text: 'Increased sympathetic nervous system activity', is_correct: false, feedback: 'SNS activity would suppress HF power, not increase it.' },
                    { option_label: 'B', option_text: 'Measurement artifact from slow breathing on the frequency spectrum', is_correct: false, feedback: 'RSA shifting into HF is a real physiological phenomenon, not an artifact.' },
                    { option_label: 'C', option_text: 'Enhanced vagal tone entraining respiratory sinus arrhythmia in the HF band', is_correct: true,  feedback: 'Correct! Paced breathing at HF frequencies increases RSA and thereby HF power.' },
                    { option_label: 'D', option_text: 'Reduced cardiac efficiency', is_correct: false, feedback: 'Higher HF power is associated with better autonomic flexibility, not pathology.' }
                ]
            }
        ];

        return key === 'emg' ? emg : hrv;
    }

    function getFallbackFlashcards(key) {
        const emg = [
            { front: 'Motor Unit', back: 'A single motor neuron and all the muscle fibres it innervates. The basic functional unit of skeletal muscle control.' },
            { front: 'MUAP (Motor Unit Action Potential)', back: 'The electrical signal recorded from a motor unit as it fires. Characterised by amplitude, duration, and number of phases.' },
            { front: 'Differential Amplifier', back: 'Amplifies the difference between two inputs while rejecting signals common to both — used to improve SNR in EMG by cancelling noise.' },
            { front: 'CMRR (Common Mode Rejection Ratio)', back: 'Measure of how well an amplifier rejects noise/interference appearing equally on both input electrodes. Higher CMRR = better noise rejection.' },
            { front: 'Electrode Impedance', back: 'Resistance at the electrode-skin interface. Must be <5 kΩ for quality EMG. Reduced by cleaning, abrasion, and conductive gel.' },
            { front: 'Nyquist Theorem', back: 'Sampling rate must be at least twice the highest frequency of interest. Surface EMG: minimum 1000 Hz (to capture 450 Hz signal content).' }
        ];
        const hrv = [
            { front: 'RR Interval', back: 'Time in milliseconds between two consecutive R-peaks in the ECG. Also called NN interval when only normal sinus beats are counted.' },
            { front: 'SDNN', back: 'Standard Deviation of Normal-to-Normal intervals. Global HRV measure; normal range 100–180 ms in healthy adults at rest.' },
            { front: 'RMSSD', back: 'Root Mean Square of Successive Differences. Primarily reflects parasympathetic (vagal) activity; normal range 20–50 ms.' },
            { front: 'pNN50', back: 'Percentage of consecutive RR intervals differing by >50 ms. Another parasympathetic index; normal range 3–40%.' },
            { front: 'LF/HF Ratio', back: 'Ratio of Low Frequency (0.04–0.15 Hz) to High Frequency (0.15–0.4 Hz) HRV power. Used as a sympathovagal balance indicator.' },
            { front: 'Respiratory Sinus Arrhythmia (RSA)', back: 'Natural heart rate oscillation synced with breathing — heart speeds up on inhale, slows on exhale. Reflects vagal tone.' }
        ];
        return (key === 'emg' ? emg : hrv).map((fc, i) => ({
            id: i + 1,
            term: fc.front,
            definition: fc.back
        }));
    }

    // ─────────────────────────────────────────────────
    // Core overlay helpers
    // ─────────────────────────────────────────────────
    function createOverlay(id) {
        const existing = document.getElementById(id);
        if (existing) { existing.remove(); }

        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'qm-overlay';
        document.body.appendChild(overlay);

        // Animate in on next tick
        requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('qm-visible')));
        return overlay;
    }

    function closeOverlay(id) {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.classList.remove('qm-visible');
        setTimeout(() => overlay.remove(), 320);
    }

    // ─────────────────────────────────────────────────
    // Quiz renderer (shared for pre/post/popup)
    // ─────────────────────────────────────────────────
    function renderQuiz({ overlayId, title, subtitle, iconClass, questions, type, preTestScore, onComplete }) {
        const overlay = createOverlay(overlayId);
        let currentQ = 0;
        let answers = [];  // { questionId, selectedLabel, correct }
        let answered = false;
        const quizStartedAt = Date.now();

        function render() {
            if (currentQ >= questions.length) {
                showScore();
                return;
            }
            const q = questions[currentQ];
            answered = false;

            const diff = q.difficulty_level || 'basic';
            const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);
            const pct = Math.round(((currentQ) / questions.length) * 100);

            overlay.innerHTML = `
            <div class="qm-modal">
                <div class="qm-header">
                    <div class="qm-header-icon ${iconClass}"><i class="fas fa-${iconClass === 'pre' ? 'clipboard-check' : iconClass === 'post' ? 'graduation-cap' : 'star'}"></i></div>
                    <div class="qm-header-title"><h3>${title}</h3><p>${subtitle}</p></div>
                    ${type === 'popup' ? '' : `<button class="qm-header-close" id="qm-skip">×</button>`}
                </div>
                <div class="qm-body">
                    <div class="qm-progress-bar"><div class="qm-progress-fill" style="width:${pct}%"></div></div>
                    <div class="qm-progress-label">Question ${currentQ + 1} of ${questions.length}</div>
                    ${type === 'popup' ? `<div class="qm-popup-badge"><i class="fas fa-star"></i> Scenario Question</div>` : ''}
                    <span class="qm-difficulty ${diff}">${diffLabel}</span>
                    <p class="qm-question-text">${q.question_text}</p>
                    <div class="qm-options" id="qm-options">
                        ${q.options.map(opt => `
                        <div class="qm-option" data-label="${opt.option_label}">
                            <span class="qm-option-label">${opt.option_label}</span>
                            <span class="qm-option-text">${opt.option_text}</span>
                        </div>`).join('')}
                    </div>
                    <div class="qm-feedback" id="qm-feedback"></div>
                    <div class="qm-explanation" id="qm-explanation"></div>
                </div>
                <div class="qm-footer">
                    <button class="qm-btn qm-btn-primary" id="qm-next-btn" disabled>
                        ${currentQ < questions.length - 1 ? 'Next Question <i class="fas fa-arrow-right"></i>' : 'See Results <i class="fas fa-chart-bar"></i>'}
                    </button>
                </div>
            </div>`;

            // Option click handler
            overlay.querySelectorAll('.qm-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    if (answered) return;
                    answered = true;

                    const label = opt.dataset.label;
                    const chosen = q.options.find(o => o.option_label === label);
                    const correct = chosen && chosen.is_correct;

                    answers.push({ questionId: q.id, selectedLabel: label, correct });

                    // Freeze all options
                    overlay.querySelectorAll('.qm-option').forEach(o => {
                        o.classList.add('qm-answered');
                        const thisOpt = q.options.find(x => x.option_label === o.dataset.label);
                        if (thisOpt && thisOpt.is_correct) o.classList.add('correct');
                    });

                    opt.classList.add(correct ? 'correct' : 'wrong');

                    // Feedback
                    const fb = overlay.querySelector('#qm-feedback');
                    fb.textContent = chosen ? chosen.feedback : '';
                    fb.className = `qm-feedback ${correct ? 'correct' : 'wrong'}`;
                    fb.style.display = 'block';

                    // Explanation
                    if (q.explanation) {
                        const ex = overlay.querySelector('#qm-explanation');
                        ex.innerHTML = `<i class="fas fa-info-circle"></i> ${q.explanation}`;
                        ex.style.display = 'block';
                    }

                    overlay.querySelector('#qm-next-btn').disabled = false;
                });
            });

            // Next button
            overlay.querySelector('#qm-next-btn').addEventListener('click', () => {
                if (!answered) return;
                currentQ++;
                render();
            });

            // Skip/close for pre/post test
            const skipBtn = overlay.querySelector('#qm-skip');
            if (skipBtn) {
                skipBtn.addEventListener('click', () => {
                    closeOverlay(overlayId);
                    if (typeof onComplete === 'function') onComplete(null);
                });
            }
        }

        function showScore() {
            const total = questions.length;
            const correct = answers.filter(a => a.correct).length;
            const pct = Math.round((correct / total) * 100);

            let grade = 'poor', gradeText = 'Keep Studying', gradeColor = '#ef4444';
            if (pct >= 90) { grade = 'excellent'; gradeText = 'Excellent!'; gradeColor = '#10b981'; }
            else if (pct >= 70) { grade = 'good'; gradeText = 'Good Work!'; gradeColor = '#3b82f6'; }
            else if (pct >= 50) { grade = 'fair'; gradeText = 'Fair — Review material'; gradeColor = '#f59e0b'; }

            let comparisonHtml = '';
            if (type === 'post' && preTestScore !== null && preTestScore !== undefined) {
                const diff = pct - preTestScore;
                const sign = diff >= 0 ? '+' : '';
                comparisonHtml = `
                <div class="qm-score-comparison">
                    <div class="qm-score-stat"><div class="stat-val">${preTestScore}%</div><div class="stat-lbl">Pre-Test</div></div>
                    <div class="qm-score-stat"><div class="stat-val">${pct}%</div><div class="stat-lbl">Post-Test</div></div>
                    <div class="qm-score-stat"><div class="stat-val" style="color:${diff >= 0 ? '#10b981' : '#f87171'}">${sign}${diff}%</div><div class="stat-lbl">Change</div></div>
                </div>
                <div class="qm-improvement ${diff < 0 ? 'negative' : ''}">
                    ${diff >= 0 ? '📈 ' + sign + diff + '% improvement after the experiment!' : '📉 Review the material to consolidate your learning.'}
                </div>`;
            }

            overlay.innerHTML = `
            <div class="qm-modal">
                <div class="qm-header">
                    <div class="qm-header-icon ${iconClass}"><i class="fas fa-${iconClass === 'pre' ? 'clipboard-check' : 'graduation-cap'}"></i></div>
                    <div class="qm-header-title"><h3>${title} — Results</h3><p>You answered ${correct} of ${total} questions correctly</p></div>
                </div>
                <div class="qm-body">
                    <div class="qm-score-screen">
                        <div class="qm-score-circle ${grade}">
                            <div class="qm-score-number">${pct}%</div>
                            <div class="qm-score-label">Score</div>
                        </div>
                        <div class="qm-score-title" style="color:${gradeColor}">${gradeText}</div>
                        <div class="qm-score-desc">${correct} / ${total} correct</div>
                        ${comparisonHtml}
                    </div>
                </div>
                <div class="qm-footer">
                    <button class="qm-btn qm-btn-primary" id="qm-done-btn">
                        ${type === 'pre' ? 'Start Experiment <i class="fas fa-flask"></i>' : 'Continue <i class="fas fa-arrow-right"></i>'}
                    </button>
                </div>
            </div>`;

            overlay.querySelector('#qm-done-btn').addEventListener('click', () => {
                closeOverlay(overlayId);
                if (typeof onComplete === 'function') {
                    onComplete({
                        score: correct,
                        total,
                        pct,
                        answers,
                        timeSpentSeconds: Math.max(1, Math.round((Date.now() - quizStartedAt) / 1000))
                    });
                }
            });
        }

        render();
    }

    // ─────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────

    /**
     * Show pre-test quiz.
     * @param {string} experimentKey  'emg' or 'hrv'
     * @param {function} onComplete   Called with { score, total, pct } or null if skipped
     */
    async function startPreTest(experimentKey, onComplete) {
        injectStyles();
        const allQ = await fetchQuestions(experimentKey);
        const questions = allQ.filter(q => q.is_pretest_eligible);
        if (questions.length === 0) {
            if (typeof onComplete === 'function') onComplete(null);
            return;
        }
        renderQuiz({
            overlayId: 'qm-pretest-overlay',
            title: 'Pre-Test',
            subtitle: `Test your prior knowledge before the ${experimentKey.toUpperCase()} experiment`,
            iconClass: 'pre',
            questions,
            type: 'pre',
            preTestScore: null,
            onComplete: (result) => {
                if (result) {
                    sessionStorage.setItem(`pretest_score_${experimentKey}`, result.pct);
                    persistAssessment(experimentKey, 'pretest', result);
                }
                if (typeof onComplete === 'function') onComplete(result);
            }
        });
    }

    /**
     * Show post-test quiz.
     * @param {string} experimentKey
     * @param {function} onComplete
     */
    async function startPostTest(experimentKey, onComplete) {
        injectStyles();
        const preScoreStr = sessionStorage.getItem(`pretest_score_${experimentKey}`);
        const preTestScore = preScoreStr !== null ? parseInt(preScoreStr, 10) : null;

        const allQ = await fetchQuestions(experimentKey);
        const questions = allQ.filter(q => q.is_posttest_eligible);
        if (questions.length === 0) {
            if (typeof onComplete === 'function') onComplete(null);
            return;
        }
        renderQuiz({
            overlayId: 'qm-posttest-overlay',
            title: 'Post-Test',
            subtitle: `How much did you learn? (${experimentKey.toUpperCase()} Experiment)`,
            iconClass: 'post',
            questions,
            type: 'post',
            preTestScore,
            onComplete: (result) => {
                if (result) {
                    persistAssessment(experimentKey, 'posttest', result);
                }
                if (typeof onComplete === 'function') onComplete(result);
            }
        });
    }

    /**
     * Show a single popup/scenario question mid-experiment.
     * @param {string} experimentKey
     * @param {function} onComplete
     */
    async function showPopupQuestion(experimentKey, onComplete) {
        injectStyles();
        const allQ = await fetchQuestions(experimentKey);
        const popupQs = allQ.filter(q => q.is_popup_question);
        if (popupQs.length === 0) {
            if (typeof onComplete === 'function') onComplete(null);
            return;
        }
        const question = popupQs[0];
        renderQuiz({
            overlayId: 'qm-popup-overlay',
            title: 'Scenario Question',
            subtitle: 'Apply what you\'ve learned so far',
            iconClass: 'popup',
            questions: [question],
            type: 'popup',
            preTestScore: null,
            onComplete: (result) => {
                if (result) {
                    persistAssessment(experimentKey, 'popup', result);
                }
                if (typeof onComplete === 'function') onComplete(result);
            }
        });
    }

    /**
     * Show flashcard viewer.
     * @param {string} experimentKey
     */
    async function showFlashcards(experimentKey) {
        injectStyles();
        const cards = await fetchFlashcards(experimentKey);
        if (cards.length === 0) return;

        const overlay = createOverlay('qm-flashcard-overlay');
        let idx = 0;

        function render() {
            const card = cards[idx];
            overlay.innerHTML = `
            <div class="qm-modal">
                <div class="qm-header">
                    <div class="qm-header-icon flash"><i class="fas fa-layer-group"></i></div>
                    <div class="qm-header-title"><h3>Flashcards</h3><p>${experimentKey.toUpperCase()} key terms — click card to flip</p></div>
                    <button class="qm-header-close" id="fc-close">×</button>
                </div>
                <div class="qm-body">
                    <div class="qm-fc-deck" id="fc-deck">
                        <div class="qm-fc-inner" id="fc-inner">
                            <div class="qm-fc-front">
                                <div class="qm-fc-label">TERM</div>
                                <div class="qm-fc-term">${card.term || card.front_content || ''}</div>
                                <div class="qm-fc-hint">Click to reveal definition →</div>
                            </div>
                            <div class="qm-fc-back">
                                <div class="qm-fc-label">DEFINITION</div>
                                <div class="qm-fc-def">${card.definition || card.back_content || ''}</div>
                            </div>
                        </div>
                    </div>
                    <div class="qm-fc-nav">
                        <button class="qm-btn qm-btn-secondary" id="fc-prev" ${idx === 0 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Prev
                        </button>
                        <span class="qm-fc-counter">${idx + 1} / ${cards.length}</span>
                        <button class="qm-btn qm-btn-secondary" id="fc-next" ${idx === cards.length - 1 ? 'disabled' : ''}>
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <p class="qm-fc-tip"><i class="fas fa-hand-pointer"></i> Click the card to flip it</p>
                </div>
                <div class="qm-footer">
                    <button class="qm-btn qm-btn-secondary" id="fc-done">Close</button>
                </div>
            </div>`;

            // Flip
            overlay.querySelector('#fc-inner').addEventListener('click', () => {
                overlay.querySelector('#fc-inner').classList.toggle('flipped');
            });

            // Navigate
            const prevBtn = overlay.querySelector('#fc-prev');
            const nextBtn = overlay.querySelector('#fc-next');
            if (prevBtn) prevBtn.addEventListener('click', () => { idx--; render(); });
            if (nextBtn) nextBtn.addEventListener('click', () => { idx++; render(); });

            overlay.querySelector('#fc-close').addEventListener('click', () => closeOverlay('qm-flashcard-overlay'));
            overlay.querySelector('#fc-done').addEventListener('click', () => closeOverlay('qm-flashcard-overlay'));
        }

        render();
    }

    // Expose
    window.QuizModule = { startPreTest, startPostTest, showPopupQuestion, showFlashcards };

})(window);
