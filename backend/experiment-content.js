const experimentContent = [
    {
        experimentKey: 'hrv',
        experimentName: 'Heart Rate Variability (HRV) Virtual Lab',
        description: 'Interactive HRV training covering autonomic physiology, ECG setup, signal acquisition, metrics, and clinical interpretation.',
        difficultyLevel: 'medium',
        concepts: [
            {
                key: 'hrv-autonomic-regulation',
                name: 'Autonomic Regulation of Heart Rate',
                description: 'How sympathetic and parasympathetic systems shape beat-to-beat variability.',
                difficultyLevel: 'basic'
            },
            {
                key: 'hrv-rr-intervals',
                name: 'RR Intervals',
                description: 'The timing between consecutive R-peaks used as the core HRV signal.',
                difficultyLevel: 'basic'
            },
            {
                key: 'hrv-ecg-instrumentation',
                name: 'ECG Instrumentation',
                description: 'Electrodes, lead configuration, sampling, and filtering requirements for HRV.',
                difficultyLevel: 'basic'
            },
            {
                key: 'hrv-time-domain',
                name: 'Time-Domain HRV Metrics',
                description: 'Interpretation of SDNN, RMSSD, and pNN50 for variability analysis.',
                difficultyLevel: 'medium'
            },
            {
                key: 'hrv-frequency-domain',
                name: 'Frequency-Domain HRV Metrics',
                description: 'LF, HF, and LF/HF analysis for spectral characterization of HRV.',
                difficultyLevel: 'advanced'
            },
            {
                key: 'hrv-clinical-interpretation',
                name: 'Clinical Interpretation of HRV',
                description: 'Using HRV changes to reason about stress, recovery, and autonomic status.',
                difficultyLevel: 'advanced'
            }
        ],
        prerequisites: [
            ['hrv-autonomic-regulation', 'hrv-rr-intervals'],
            ['hrv-rr-intervals', 'hrv-time-domain'],
            ['hrv-time-domain', 'hrv-frequency-domain'],
            ['hrv-frequency-domain', 'hrv-clinical-interpretation']
        ],
        modules: [
            {
                key: 'hrv-foundations',
                title: 'HRV Foundations',
                description: 'Build intuition for what HRV measures and why it matters physiologically.',
                difficultyLevel: 'basic',
                estimatedDurationMinutes: 18,
                displayOrder: 1,
                conceptKeys: ['hrv-autonomic-regulation', 'hrv-rr-intervals'],
                sections: [
                    {
                        type: 'theory',
                        title: 'What HRV Represents',
                        body: 'Heart rate variability is the variation in the timing between normal heartbeats. It reflects rapid autonomic adjustments, rather than just average heart rate.',
                        contentJson: { learningObjective: 'Explain why HRV is a beat-to-beat measure instead of a simple pulse average.' },
                        order: 1
                    },
                    {
                        type: 'guided_walkthrough',
                        title: 'Autonomic Balance in Practice',
                        body: 'Relate sympathetic activation to reduced variability and parasympathetic recovery to increased short-term variability. Compare calm breathing with stress-like activation.',
                        contentJson: { prompt: 'Contrast a relaxed state with a cognitively demanding state.' },
                        order: 2
                    },
                    {
                        type: 'reflection',
                        title: 'Interpret Beat-to-Beat Patterns',
                        body: 'Use RR interval traces to distinguish between healthy variability, flattened variability, and irregular noisy recordings.',
                        contentJson: { deliverable: 'Short written interpretation of three RR traces.' },
                        order: 3
                    }
                ]
            },
            {
                key: 'hrv-acquisition',
                title: 'ECG Acquisition and Setup',
                description: 'Prepare the ECG system, electrodes, and skin for clean HRV acquisition.',
                difficultyLevel: 'basic',
                estimatedDurationMinutes: 22,
                displayOrder: 2,
                conceptKeys: ['hrv-ecg-instrumentation', 'hrv-rr-intervals'],
                sections: [
                    {
                        type: 'equipment',
                        title: 'HRV Lab Equipment',
                        body: 'Review the ECG recording system, Ag/AgCl electrodes, conductive gel, prep swabs, and software used for R-peak detection.',
                        contentJson: { equipment: ['ECG recording system', 'Ag/AgCl electrodes', 'Lead II configuration', 'Conductive gel', 'Alcohol swabs', 'Analysis software'] },
                        order: 1
                    },
                    {
                        type: 'procedure',
                        title: 'Electrode Placement Workflow',
                        body: 'Prepare the skin, place the reference and active leads, verify Lead II morphology, and confirm a clean baseline before recording.',
                        contentJson: { checklist: ['Clean skin', 'Reduce impedance', 'Place leads', 'Inspect waveform', 'Confirm sampling settings'] },
                        order: 2
                    },
                    {
                        type: 'troubleshooting',
                        title: 'Artifact Control',
                        body: 'Identify motion artifact, baseline drift, and poor contact noise. Link each artifact to a likely setup issue and corrective action.',
                        contentJson: { artifacts: ['Motion artifact', 'Baseline drift', 'Poor electrode contact'] },
                        order: 3
                    }
                ]
            },
            {
                key: 'hrv-analysis',
                title: 'HRV Metrics and Analysis',
                description: 'Compute and compare time-domain and frequency-domain metrics from an HRV recording.',
                difficultyLevel: 'medium',
                estimatedDurationMinutes: 26,
                displayOrder: 3,
                conceptKeys: ['hrv-time-domain', 'hrv-frequency-domain'],
                sections: [
                    {
                        type: 'theory',
                        title: 'Time-Domain Metrics',
                        body: 'Use SDNN for overall variability and RMSSD or pNN50 for short-term parasympathetic activity. Match each metric to its physiological emphasis.',
                        contentJson: { metrics: ['SDNN', 'RMSSD', 'pNN50'] },
                        order: 1
                    },
                    {
                        type: 'analysis',
                        title: 'Frequency-Domain Analysis',
                        body: 'Interpret LF and HF power, understand respiratory sinus arrhythmia, and discuss the limitations of treating LF/HF as a direct sympathovagal balance score.',
                        contentJson: { bands: ['LF 0.04-0.15 Hz', 'HF 0.15-0.40 Hz'] },
                        order: 2
                    },
                    {
                        type: 'nonlinear',
                        title: 'Poincare Plot Interpretation',
                        body: 'Use SD1 and SD2 to reason about short-term and long-term variability patterns that are not obvious in a single scalar metric.',
                        contentJson: { outputs: ['SD1', 'SD2', 'shape interpretation'] },
                        order: 3
                    }
                ]
            },
            {
                key: 'hrv-clinical-applications',
                title: 'Clinical and Performance Applications',
                description: 'Apply HRV interpretation to stress, recovery, workload, and autonomic regulation scenarios.',
                difficultyLevel: 'advanced',
                estimatedDurationMinutes: 20,
                displayOrder: 4,
                conceptKeys: ['hrv-clinical-interpretation', 'hrv-frequency-domain'],
                sections: [
                    {
                        type: 'case_study',
                        title: 'Stress vs Recovery Case Review',
                        body: 'Compare two learners: one with reduced RMSSD after poor sleep and one with recovered variability after paced breathing and rest.',
                        contentJson: { cases: ['Stress-dominant profile', 'Recovery profile'] },
                        order: 1
                    },
                    {
                        type: 'clinical_reasoning',
                        title: 'When Not to Over-Interpret',
                        body: 'Explain why signal quality, ectopic beats, medication, and breathing rate must be considered before drawing conclusions from HRV.',
                        contentJson: { cautions: ['Artifacts', 'Ectopy', 'Breathing effects', 'Medication effects'] },
                        order: 2
                    },
                    {
                        type: 'application',
                        title: 'Adaptive Lab Recommendation',
                        body: 'Select the next learning activity based on whether the learner struggles more with acquisition quality or with metric interpretation.',
                        contentJson: { outputs: ['Repeat acquisition lab', 'Metric interpretation quiz', 'Clinical case discussion'] },
                        order: 3
                    }
                ]
            }
        ],
        questions: [
            {
                moduleKey: 'hrv-foundations',
                conceptKey: 'hrv-autonomic-regulation',
                questionType: 'multiple_choice',
                difficultyLevel: 'basic',
                questionText: 'Which branch of the autonomic nervous system is most closely associated with increased short-term HRV at rest?',
                explanation: 'Parasympathetic or vagal activity increases rapid beat-to-beat variability, especially as reflected by RMSSD and HF power.',
                expectedTimeSeconds: 40,
                marks: 1,
                isPretestEligible: true,
                isPosttestEligible: true,
                options: [
                    { label: 'A', text: 'Sympathetic branch', isCorrect: false, feedback: 'Sympathetic activation usually reduces short-term variability.' },
                    { label: 'B', text: 'Parasympathetic branch', isCorrect: true, feedback: 'Correct. Vagal activity is the main driver of short-term HRV.' },
                    { label: 'C', text: 'Somatic motor system', isCorrect: false, feedback: 'This system does not directly generate HRV metrics.' },
                    { label: 'D', text: 'Enteric nervous system', isCorrect: false, feedback: 'Enteric control is not the primary explanation for HRV changes.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'hrv-acquisition',
                conceptKey: 'hrv-ecg-instrumentation',
                questionType: 'multiple_choice',
                difficultyLevel: 'basic',
                questionText: 'Why is Lead II commonly preferred for HRV acquisition?',
                explanation: 'Lead II usually produces clear upright R-waves that are easier for automated beat detection algorithms to identify reliably.',
                expectedTimeSeconds: 45,
                marks: 1,
                isPretestEligible: true,
                options: [
                    { label: 'A', text: 'It eliminates all motion artifact', isCorrect: false, feedback: 'No ECG lead completely eliminates motion artifact.' },
                    { label: 'B', text: 'It provides clear R-wave morphology for detection', isCorrect: true, feedback: 'Correct. Clear R-peaks improve RR interval extraction.' },
                    { label: 'C', text: 'It directly measures sympathetic tone', isCorrect: false, feedback: 'Lead configuration does not directly measure sympathetic tone.' },
                    { label: 'D', text: 'It does not require skin preparation', isCorrect: false, feedback: 'Skin preparation is still important.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'hrv-analysis',
                conceptKey: 'hrv-time-domain',
                questionType: 'multiple_choice',
                difficultyLevel: 'medium',
                questionText: 'Which HRV metric is most sensitive to short-term parasympathetic fluctuations?',
                explanation: 'RMSSD emphasizes successive beat-to-beat changes and is a common index of vagal modulation.',
                expectedTimeSeconds: 35,
                marks: 1,
                isPosttestEligible: true,
                options: [
                    { label: 'A', text: 'RMSSD', isCorrect: true, feedback: 'Correct. RMSSD captures short-term vagal variability.' },
                    { label: 'B', text: 'Mean heart rate', isCorrect: false, feedback: 'Average heart rate alone does not capture variability.' },
                    { label: 'C', text: 'QT interval', isCorrect: false, feedback: 'QT interval is not an HRV metric.' },
                    { label: 'D', text: 'Systolic pressure', isCorrect: false, feedback: 'This is not derived from RR interval variability.' }
                ],
                correctAnswer: { option: 'A' }
            },
            {
                moduleKey: 'hrv-analysis',
                conceptKey: 'hrv-frequency-domain',
                questionType: 'multiple_choice',
                difficultyLevel: 'advanced',
                questionText: 'What is the most defensible interpretation of increased HF power during paced breathing?',
                explanation: 'HF power generally reflects respiratory-linked parasympathetic modulation, especially when breathing frequency lies in the HF band.',
                expectedTimeSeconds: 55,
                marks: 1,
                isPosttestEligible: true,
                options: [
                    { label: 'A', text: 'Guaranteed increase in sympathetic drive', isCorrect: false, feedback: 'HF power is not interpreted that way.' },
                    { label: 'B', text: 'Respiratory-linked vagal modulation is stronger', isCorrect: true, feedback: 'Correct. HF typically tracks respiratory sinus arrhythmia.' },
                    { label: 'C', text: 'RR interval detection has failed', isCorrect: false, feedback: 'This is not the expected explanation.' },
                    { label: 'D', text: 'The recording no longer needs artifact review', isCorrect: false, feedback: 'Signal quality still matters.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'hrv-clinical-applications',
                conceptKey: 'hrv-clinical-interpretation',
                questionType: 'scenario',
                difficultyLevel: 'advanced',
                questionText: 'A learner shows low RMSSD, high perceived stress, and poor sleep after an exam week. Which next step is most appropriate?',
                explanation: 'The strongest immediate response is to interpret the pattern as reduced recovery and direct the learner toward stress-recovery education plus a repeat recording after rest.',
                expectedTimeSeconds: 70,
                marks: 2,
                isPopupQuestion: true,
                options: [
                    { label: 'A', text: 'Conclude permanent autonomic dysfunction immediately', isCorrect: false, feedback: 'This over-interprets a single context-dependent recording.' },
                    { label: 'B', text: 'Repeat after recovery and review stress-management context', isCorrect: true, feedback: 'Correct. Context and repeat measurements matter.' },
                    { label: 'C', text: 'Ignore sleep because HRV is unaffected by it', isCorrect: false, feedback: 'Sleep strongly affects HRV.' },
                    { label: 'D', text: 'Use only LF/HF and ignore the rest of the record', isCorrect: false, feedback: 'A single ratio should not dominate interpretation.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'hrv-acquisition',
                conceptKey: 'hrv-rr-intervals',
                questionType: 'multiple_choice',
                difficultyLevel: 'medium',
                questionText: 'Which issue most directly corrupts RR interval extraction for HRV analysis?',
                explanation: 'Missed or falsely detected R-peaks directly distort the sequence of RR intervals used for all downstream HRV calculations.',
                expectedTimeSeconds: 45,
                marks: 1,
                options: [
                    { label: 'A', text: 'Incorrect browser theme', isCorrect: false, feedback: 'This does not affect ECG extraction.' },
                    { label: 'B', text: 'R-peak misdetection from noisy ECG', isCorrect: true, feedback: 'Correct. HRV depends on accurate RR timing.' },
                    { label: 'C', text: 'Using a shorter report title', isCorrect: false, feedback: 'This is unrelated.' },
                    { label: 'D', text: 'Opening the glossary during the lab', isCorrect: false, feedback: 'This does not corrupt the signal.' }
                ],
                correctAnswer: { option: 'B' }
            }
        ],
        flashcards: [
            {
                moduleKey: 'hrv-foundations',
                conceptKey: 'hrv-autonomic-regulation',
                front: 'HRV',
                back: 'Beat-to-beat variation in normal RR intervals, reflecting dynamic autonomic regulation.',
                type: 'definition',
                difficultyLevel: 'basic'
            },
            {
                moduleKey: 'hrv-acquisition',
                conceptKey: 'hrv-ecg-instrumentation',
                front: 'Why Lead II?',
                back: 'Lead II usually gives prominent upright R-waves that simplify beat detection.',
                type: 'equipment',
                difficultyLevel: 'basic'
            },
            {
                moduleKey: 'hrv-analysis',
                conceptKey: 'hrv-time-domain',
                front: 'RMSSD',
                back: 'Root mean square of successive RR differences; mainly reflects short-term parasympathetic activity.',
                type: 'metric',
                difficultyLevel: 'medium'
            },
            {
                moduleKey: 'hrv-analysis',
                conceptKey: 'hrv-frequency-domain',
                front: 'HF Band',
                back: '0.15 to 0.40 Hz; commonly linked to respiratory sinus arrhythmia and vagal modulation.',
                type: 'metric',
                difficultyLevel: 'medium'
            },
            {
                moduleKey: 'hrv-analysis',
                conceptKey: 'hrv-frequency-domain',
                front: 'SD1 vs SD2',
                back: 'SD1 reflects short-term variability; SD2 reflects longer-term variability on a Poincare plot.',
                type: 'nonlinear',
                difficultyLevel: 'advanced'
            },
            {
                moduleKey: 'hrv-clinical-applications',
                conceptKey: 'hrv-clinical-interpretation',
                front: 'Clinical caution',
                back: 'Interpret HRV alongside signal quality, breathing, sleep, medication, and recording context.',
                type: 'clinical',
                difficultyLevel: 'advanced'
            }
        ],
        adaptiveRules: [
            {
                name: 'HRV Acquisition Remediation',
                description: 'Recommend setup remediation when the learner struggles with noisy HRV acquisition.',
                type: 'remediation',
                priority: 10,
                conditionJson: {
                    experiment_key: 'hrv',
                    trigger: 'low_accuracy_or_high_noise',
                    targets: ['hrv-ecg-instrumentation', 'hrv-rr-intervals']
                },
                actionJson: {
                    recommendation_type: 'repeat_module',
                    module_key: 'hrv-acquisition',
                    message: 'Repeat the acquisition workflow and artifact control sections before advanced analysis.'
                }
            },
            {
                name: 'HRV Metric Interpretation Boost',
                description: 'Escalate theory support when frequency-domain interpretation remains weak.',
                type: 'scaffolding',
                priority: 8,
                conditionJson: {
                    experiment_key: 'hrv',
                    trigger: 'frequency_domain_errors',
                    targets: ['hrv-frequency-domain']
                },
                actionJson: {
                    recommendation_type: 'guided_review',
                    module_key: 'hrv-analysis',
                    message: 'Review LF, HF, and paced breathing examples with guided hints enabled.'
                }
            }
        ]
    },
    {
        experimentKey: 'emg',
        experimentName: 'Electromyography (EMG) Virtual Lab',
        description: 'Interactive EMG training covering muscle physiology, electrode placement, calibration, recording, and clinical interpretation.',
        difficultyLevel: 'medium',
        concepts: [
            {
                key: 'emg-motor-unit-recruitment',
                name: 'Motor Unit Recruitment',
                description: 'How force production changes EMG amplitude through motor unit recruitment and firing rate.',
                difficultyLevel: 'basic'
            },
            {
                key: 'emg-electrode-placement',
                name: 'Surface Electrode Placement',
                description: 'Placement of active, reference, and ground electrodes for clean muscle recordings.',
                difficultyLevel: 'basic'
            },
            {
                key: 'emg-skin-preparation',
                name: 'Skin Preparation and Impedance',
                description: 'Cleaning, abrasion, and gel use to reduce impedance and noise.',
                difficultyLevel: 'basic'
            },
            {
                key: 'emg-calibration',
                name: 'EMG Calibration and Baseline Control',
                description: 'Calibration checks, baseline noise, and amplifier gain setup.',
                difficultyLevel: 'medium'
            },
            {
                key: 'emg-signal-features',
                name: 'EMG Signal Features',
                description: 'Amplitude, frequency, onset timing, and artifact features in EMG traces.',
                difficultyLevel: 'medium'
            },
            {
                key: 'emg-clinical-application',
                name: 'Clinical and Functional EMG Interpretation',
                description: 'Using EMG data for muscle activation studies and neuromuscular assessment.',
                difficultyLevel: 'advanced'
            }
        ],
        prerequisites: [
            ['emg-skin-preparation', 'emg-electrode-placement'],
            ['emg-electrode-placement', 'emg-calibration'],
            ['emg-motor-unit-recruitment', 'emg-signal-features'],
            ['emg-signal-features', 'emg-clinical-application']
        ],
        modules: [
            {
                key: 'emg-foundations',
                title: 'EMG Foundations',
                description: 'Understand how muscle activation generates detectable electrical signals.',
                difficultyLevel: 'basic',
                estimatedDurationMinutes: 18,
                displayOrder: 1,
                conceptKeys: ['emg-motor-unit-recruitment'],
                sections: [
                    {
                        type: 'theory',
                        title: 'What Surface EMG Measures',
                        body: 'Surface EMG records summed electrical activity from muscle fibers activated by motor neurons. Signal amplitude changes with recruitment and firing rate.',
                        contentJson: { learningObjective: 'Describe how muscle activation translates into a surface EMG trace.' },
                        order: 1
                    },
                    {
                        type: 'guided_walkthrough',
                        title: 'Force and Recruitment',
                        body: 'Compare resting muscle, moderate contraction, and strong contraction to see how recruitment patterns change the recorded waveform.',
                        contentJson: { comparisons: ['Rest', 'Moderate contraction', 'Strong contraction'] },
                        order: 2
                    },
                    {
                        type: 'reflection',
                        title: 'Muscle Selection Strategy',
                        body: 'Choose a target muscle based on accessibility, contraction task, and clinical relevance.',
                        contentJson: { muscles: ['Biceps', 'Forearm flexors', 'Deltoid', 'Quadriceps'] },
                        order: 3
                    }
                ]
            },
            {
                key: 'emg-preparation',
                title: 'Electrode Placement and Skin Preparation',
                description: 'Prepare the skin and place electrodes to reduce noise and maximize signal fidelity.',
                difficultyLevel: 'basic',
                estimatedDurationMinutes: 24,
                displayOrder: 2,
                conceptKeys: ['emg-skin-preparation', 'emg-electrode-placement'],
                sections: [
                    {
                        type: 'procedure',
                        title: 'Four-Step Preparation Workflow',
                        body: 'Clean the skin, lightly abrade, apply gel when needed, and place the active, reference, and ground electrodes correctly.',
                        contentJson: { steps: ['Clean', 'Abrade', 'Apply gel', 'Place electrodes'] },
                        order: 1
                    },
                    {
                        type: 'equipment',
                        title: 'Electrode Roles',
                        body: 'Differentiate the signal electrode, reference electrode, and ground electrode. Explain why spacing and orientation matter over the muscle belly.',
                        contentJson: { roles: ['Active electrode', 'Reference electrode', 'Ground electrode'] },
                        order: 2
                    },
                    {
                        type: 'troubleshooting',
                        title: 'Noise and Cross-Talk Control',
                        body: 'Identify mains interference, movement artifact, and cross-talk from nearby muscles. Match each to a corrective action.',
                        contentJson: { issues: ['Powerline noise', 'Movement artifact', 'Cross-talk'] },
                        order: 3
                    }
                ]
            },
            {
                key: 'emg-calibration-recording',
                title: 'Calibration and Recording',
                description: 'Calibrate baseline, confirm gain, and collect interpretable EMG recordings.',
                difficultyLevel: 'medium',
                estimatedDurationMinutes: 25,
                displayOrder: 3,
                conceptKeys: ['emg-calibration', 'emg-signal-features'],
                sections: [
                    {
                        type: 'calibration',
                        title: 'Baseline Verification',
                        body: 'Check resting baseline noise before the contraction trial. Reposition or repeat prep if the baseline is unstable.',
                        contentJson: { criteria: ['Stable baseline', 'Acceptable noise floor', 'Correct amplifier gain'] },
                        order: 1
                    },
                    {
                        type: 'recording',
                        title: 'Trial Recording Conditions',
                        body: 'Record EMG during normal, weak, and strong contractions. Compare onset timing, amplitude, and smoothness of the activation pattern.',
                        contentJson: { conditions: ['Normal', 'Weak', 'Strong'] },
                        order: 2
                    },
                    {
                        type: 'analysis',
                        title: 'Signal Feature Review',
                        body: 'Inspect rectified amplitude, activation onset, and possible fatigue or artifact patterns within the recording.',
                        contentJson: { features: ['Amplitude', 'Onset timing', 'Rectified envelope', 'Artifact pattern'] },
                        order: 3
                    }
                ]
            },
            {
                key: 'emg-clinical-applications',
                title: 'Functional and Clinical EMG Interpretation',
                description: 'Use EMG observations to reason about task performance and neuromuscular dysfunction.',
                difficultyLevel: 'advanced',
                estimatedDurationMinutes: 20,
                displayOrder: 4,
                conceptKeys: ['emg-clinical-application', 'emg-signal-features'],
                sections: [
                    {
                        type: 'case_study',
                        title: 'Muscle Activation Case Comparison',
                        body: 'Compare healthy recruitment with a delayed or reduced activation pattern and identify what additional context is needed before concluding pathology.',
                        contentJson: { cases: ['Expected recruitment', 'Delayed onset', 'Low-amplitude activation'] },
                        order: 1
                    },
                    {
                        type: 'clinical_reasoning',
                        title: 'Common Interpretation Pitfalls',
                        body: 'Differentiate true weakness from poor electrode placement, inadequate prep, or inconsistent effort.',
                        contentJson: { pitfalls: ['Poor placement', 'High impedance', 'Inconsistent effort', 'Cross-talk'] },
                        order: 2
                    },
                    {
                        type: 'application',
                        title: 'Adaptive Follow-Up Recommendation',
                        body: 'Choose whether the learner needs another placement drill, another calibration trial, or a higher-level interpretation challenge.',
                        contentJson: { outputs: ['Repeat placement drill', 'Repeat calibration', 'Advance to case analysis'] },
                        order: 3
                    }
                ]
            }
        ],
        questions: [
            {
                moduleKey: 'emg-foundations',
                conceptKey: 'emg-motor-unit-recruitment',
                questionType: 'multiple_choice',
                difficultyLevel: 'basic',
                questionText: 'What usually happens to surface EMG amplitude as muscle force increases during a voluntary contraction?',
                explanation: 'As more motor units are recruited and firing rates increase, the summed EMG amplitude usually rises.',
                expectedTimeSeconds: 40,
                marks: 1,
                isPretestEligible: true,
                isPosttestEligible: true,
                options: [
                    { label: 'A', text: 'It usually increases', isCorrect: true, feedback: 'Correct. Recruitment and rate coding usually increase amplitude.' },
                    { label: 'B', text: 'It always becomes zero', isCorrect: false, feedback: 'Active contraction does not produce zero EMG.' },
                    { label: 'C', text: 'It becomes unrelated to muscle activity', isCorrect: false, feedback: 'EMG remains linked to muscle activation.' },
                    { label: 'D', text: 'It only reflects heart activity', isCorrect: false, feedback: 'That would indicate artifact, not the usual explanation.' }
                ],
                correctAnswer: { option: 'A' }
            },
            {
                moduleKey: 'emg-preparation',
                conceptKey: 'emg-skin-preparation',
                questionType: 'multiple_choice',
                difficultyLevel: 'basic',
                questionText: 'Why is skin preparation important before placing surface EMG electrodes?',
                explanation: 'Proper preparation reduces impedance and improves signal quality by removing oil and dead skin cells.',
                expectedTimeSeconds: 35,
                marks: 1,
                isPretestEligible: true,
                options: [
                    { label: 'A', text: 'To increase muscle force output directly', isCorrect: false, feedback: 'Preparation affects signal quality, not force generation directly.' },
                    { label: 'B', text: 'To reduce impedance and noise', isCorrect: true, feedback: 'Correct. Cleaner contact improves EMG recordings.' },
                    { label: 'C', text: 'To remove the need for calibration', isCorrect: false, feedback: 'Calibration is still needed.' },
                    { label: 'D', text: 'To prevent all cross-talk permanently', isCorrect: false, feedback: 'Preparation helps, but it does not eliminate all cross-talk.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'emg-preparation',
                conceptKey: 'emg-electrode-placement',
                questionType: 'multiple_choice',
                difficultyLevel: 'medium',
                questionText: 'Where should the active surface EMG electrode typically be placed?',
                explanation: 'The active electrode is usually placed over the muscle belly, aligned with the muscle fibers to capture the strongest local signal.',
                expectedTimeSeconds: 45,
                marks: 1,
                options: [
                    { label: 'A', text: 'Over the tendon only', isCorrect: false, feedback: 'The tendon is not the preferred active recording location.' },
                    { label: 'B', text: 'Over the muscle belly aligned with fibers', isCorrect: true, feedback: 'Correct. This placement gives a stronger, more relevant signal.' },
                    { label: 'C', text: 'Randomly anywhere on the limb', isCorrect: false, feedback: 'Placement must be anatomically intentional.' },
                    { label: 'D', text: 'Directly on the nail bed', isCorrect: false, feedback: 'This is unrelated to surface EMG acquisition.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'emg-calibration-recording',
                conceptKey: 'emg-calibration',
                questionType: 'multiple_choice',
                difficultyLevel: 'medium',
                questionText: 'What is the main purpose of checking the EMG baseline before recording a contraction trial?',
                explanation: 'Baseline inspection helps confirm acceptable noise levels and stable instrumentation before interpreting activation data.',
                expectedTimeSeconds: 45,
                marks: 1,
                isPosttestEligible: true,
                options: [
                    { label: 'A', text: 'To measure blood pressure', isCorrect: false, feedback: 'This is unrelated to EMG baseline verification.' },
                    { label: 'B', text: 'To verify stable noise levels and gain settings', isCorrect: true, feedback: 'Correct. A clean baseline is required before analysis.' },
                    { label: 'C', text: 'To remove the need for electrodes', isCorrect: false, feedback: 'Electrodes are still required.' },
                    { label: 'D', text: 'To convert EMG into an ECG recording', isCorrect: false, feedback: 'These are different modalities.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'emg-calibration-recording',
                conceptKey: 'emg-signal-features',
                questionType: 'scenario',
                difficultyLevel: 'advanced',
                questionText: 'An EMG trace shows a large unstable baseline before any contraction starts. What is the most appropriate first response?',
                explanation: 'The most defensible action is to suspect setup or motion artifact, then repeat skin prep or electrode placement before interpreting the trace.',
                expectedTimeSeconds: 60,
                marks: 2,
                isPopupQuestion: true,
                options: [
                    { label: 'A', text: 'Interpret it as strong pre-activation immediately', isCorrect: false, feedback: 'Not before checking for artifact.' },
                    { label: 'B', text: 'Recheck prep, placement, and movement artifact sources', isCorrect: true, feedback: 'Correct. Clean acquisition comes first.' },
                    { label: 'C', text: 'Ignore it because baseline never matters', isCorrect: false, feedback: 'Baseline quality is essential.' },
                    { label: 'D', text: 'Delete all muscle selections from the lab', isCorrect: false, feedback: 'That does not solve the acquisition problem.' }
                ],
                correctAnswer: { option: 'B' }
            },
            {
                moduleKey: 'emg-clinical-applications',
                conceptKey: 'emg-clinical-application',
                questionType: 'multiple_choice',
                difficultyLevel: 'advanced',
                questionText: 'Which conclusion is safest when a weak EMG signal appears during a poorly prepared recording?',
                explanation: 'Poor preparation can reduce signal quality, so weak amplitude should not be interpreted as true weakness until the setup is verified.',
                expectedTimeSeconds: 55,
                marks: 1,
                isPosttestEligible: true,
                options: [
                    { label: 'A', text: 'The muscle is definitely denervated', isCorrect: false, feedback: 'That conclusion is too strong for a poor-quality recording.' },
                    { label: 'B', text: 'Repeat acquisition before making a clinical claim', isCorrect: true, feedback: 'Correct. Acquisition quality must be validated first.' },
                    { label: 'C', text: 'Surface EMG cannot ever be useful clinically', isCorrect: false, feedback: 'That is incorrect.' },
                    { label: 'D', text: 'Cross-talk proves the muscle is normal', isCorrect: false, feedback: 'Cross-talk complicates interpretation.' }
                ],
                correctAnswer: { option: 'B' }
            }
        ],
        flashcards: [
            {
                moduleKey: 'emg-foundations',
                conceptKey: 'emg-motor-unit-recruitment',
                front: 'Motor unit recruitment',
                back: 'As force increases, more motor units contribute to the recorded EMG signal.',
                type: 'definition',
                difficultyLevel: 'basic'
            },
            {
                moduleKey: 'emg-preparation',
                conceptKey: 'emg-skin-preparation',
                front: 'Skin prep goal',
                back: 'Reduce impedance and improve electrode-skin contact before recording.',
                type: 'procedure',
                difficultyLevel: 'basic'
            },
            {
                moduleKey: 'emg-preparation',
                conceptKey: 'emg-electrode-placement',
                front: 'Active electrode placement',
                back: 'Place it over the muscle belly and align it with fiber direction when possible.',
                type: 'equipment',
                difficultyLevel: 'medium'
            },
            {
                moduleKey: 'emg-calibration-recording',
                conceptKey: 'emg-calibration',
                front: 'Baseline check',
                back: 'Confirm a stable low-noise baseline before starting the contraction trial.',
                type: 'calibration',
                difficultyLevel: 'medium'
            },
            {
                moduleKey: 'emg-calibration-recording',
                conceptKey: 'emg-signal-features',
                front: 'Common EMG artifact',
                back: 'Movement artifact can create unstable low-frequency fluctuations unrelated to muscle activation.',
                type: 'analysis',
                difficultyLevel: 'medium'
            },
            {
                moduleKey: 'emg-clinical-applications',
                conceptKey: 'emg-clinical-application',
                front: 'Interpretation rule',
                back: 'Do not label weak EMG as pathology until placement, prep, and effort are verified.',
                type: 'clinical',
                difficultyLevel: 'advanced'
            }
        ],
        adaptiveRules: [
            {
                name: 'EMG Placement Remediation',
                description: 'Redirect the learner to placement drills when preparation errors dominate.',
                type: 'remediation',
                priority: 10,
                conditionJson: {
                    experiment_key: 'emg',
                    trigger: 'placement_or_prep_errors',
                    targets: ['emg-skin-preparation', 'emg-electrode-placement']
                },
                actionJson: {
                    recommendation_type: 'repeat_module',
                    module_key: 'emg-preparation',
                    message: 'Repeat the skin preparation and electrode placement workflow before more recordings.'
                }
            },
            {
                name: 'EMG Interpretation Scaffolding',
                description: 'Give guided support when the learner confuses artifact with muscle activation.',
                type: 'scaffolding',
                priority: 7,
                conditionJson: {
                    experiment_key: 'emg',
                    trigger: 'artifact_interpretation_errors',
                    targets: ['emg-signal-features', 'emg-clinical-application']
                },
                actionJson: {
                    recommendation_type: 'guided_review',
                    module_key: 'emg-calibration-recording',
                    message: 'Review baseline noise, artifact examples, and signal feature interpretation with guided hints.'
                }
            }
        ]
    }
];

module.exports = { experimentContent };