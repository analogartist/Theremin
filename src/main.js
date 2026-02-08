import { AudioEngine } from './audio.js';
import { HandTracker } from './vision.js';
import { Visualizer } from './visuals.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoElement = document.querySelector('.input_video');
    const canvasElement = document.querySelector('.output_canvas');
    const startBtn = document.getElementById('start-btn');
    const loadingPanel = document.getElementById('loading');
    const controlsPanel = document.getElementById('controls');

    // Modules
    const audio = new AudioEngine();
    const visualizer = new Visualizer(canvasElement);

    // B3 to E5 Chromatic Scale (1.5 octaves = 18 notes)
    // Formula: f = 440 * 2^((n-49)/12) where n is key number
    // B3 is ~246.94Hz
    const baseFreq = 246.94;
    const notes = [];
    const noteNames = ["B3", "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"];
    for (let i = 0; i < 14; i++) {
        notes.push(baseFreq * Math.pow(2, i / 12));
    }

    // State
    let activeNotes = new Set(); // indices of active notes
    let isChordsMode = false; // Default: Melody Mode
    let lastFistState = false; // For debouncing toggle
    let modeToggleCooldown = 0;
    let volume = 0.5; // Default Volume
    let volumeGrabY = null; // Y position when pinch started
    let volumeGrabValue = 0.5; // Volume value when pinch started
    let audioInitialized = false; // Track if Tone.js is ready
    let pitchBendOffset = 0; // Current pitch bend in semitones (-5 to +5)
    let hoveredNoteIndex = null; // Index of note hand is over (for guidance)
    let isPitchBendEnabled = true; // Toggle for depth-based bending
    let bendToggleCooldown = 0; // Debounce for the V-sign toggle

    // Callback for when hand tracking results are available
    const onResults = (results) => {
        // Hide loading panel once we get the first result
        if (loadingPanel.style.display !== 'none') {
            loadingPanel.style.display = 'none';
            controlsPanel.classList.remove('hidden');
        }

        // Update Cooldowns
        if (modeToggleCooldown > 0) modeToggleCooldown--;
        if (bendToggleCooldown > 0) bendToggleCooldown--;

        // Process Hands
        const currentActiveNotes = new Set();
        hoveredNoteIndex = null; // Reset for this frame

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            results.multiHandLandmarks.forEach((landmarks, i) => {
                const label = results.multiHandedness[i].label; // 'Left' or 'Right'
                const wrist = landmarks[0];
                const wristX = 1.0 - wrist.x;

                // Track "hover" for right hand (targeting feedback)
                const isRightHand = (label === 'Left' || label === 'left' || wristX >= 0.35);
                if (isRightHand) {
                    const index = landmarks[8];
                    const indexX = 1.0 - index.x;
                    const splitPoint = 0.3;
                    if (indexX > splitPoint) {
                        const normX = (indexX - splitPoint) / (1 - splitPoint);
                        // Increase horizontal padding to 10% for better edge reliability
                        const padding = 0.10;
                        const normXAdjusted = (normX - padding) / (1 - 2 * padding);
                        hoveredNoteIndex = Math.floor(normXAdjusted * 14);
                        if (hoveredNoteIndex < 0) hoveredNoteIndex = null;
                        if (hoveredNoteIndex >= 14) hoveredNoteIndex = null;
                    }
                }

                const wrist_mirrored = wrist; // just use wrist reference

                // MIRRORING LOGIC:
                // MediaPipe: x=0 is Camera-Left (User-Right).
                // CSS: Video is mirrored (scaleX(-1)). So Visually, x=0 is Screen-Right.
                // We want x=0 to be Screen-Left (User-Left).
                // So we invert X: x = 1.0 - x.
                const x = 1.0 - wrist.x;

                // Also need to invert landmarks for drawing/collision later?
                // Yes, all X coordinates need inversion for consistency.
                // Let's invert landmarks in place or just handle Key logic with 1-x.
                // It's cleaner to invert the tips too.


                // Strict 30% / 70% Split
                const splitPoint = 0.3;

                if (x < splitPoint) {
                    // --- LEFT ZONE: CONTROL (0% - 30%) ---

                    // 1. Volume Control (Pinch-to-Slide - Relative Motion)
                    const thumb = landmarks[4];
                    const index = landmarks[8];
                    const pinchDist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                    if (pinchDist < 0.05) {
                        // PINCHED
                        if (volumeGrabY === null) {
                            // First frame of pinch - record starting position and current volume
                            volumeGrabY = wrist.y;
                            volumeGrabValue = volume;
                        } else {
                            // Subsequent frames - adjust volume based on delta from grab point
                            const deltaY = volumeGrabY - wrist.y; // Positive = moved up, Negative = moved down
                            volume = Math.max(0, Math.min(1, volumeGrabValue + deltaY));
                        }
                    } else {
                        // RELEASED - reset grab tracking
                        volumeGrabY = null;
                        volumeGrabValue = volume; // Lock current volume
                    }

                    // 2. Mode Toggle (Fist Gesture)
                    const middleTip = landmarks[12];
                    const middlePip = landmarks[10];
                    const ringTip = landmarks[16];
                    const ringPip = landmarks[14];
                    const pinkyTip = landmarks[20];
                    const pinkyPip = landmarks[18];
                    const indexTip = landmarks[8];
                    const indexPip = landmarks[6];

                    // Check if AT LEAST 3 fingers are curled (Index, Middle, Ring, Pinky)
                    let curledCount = 0;
                    if (indexTip.y > indexPip.y) curledCount++;
                    if (middleTip.y > middlePip.y) curledCount++;
                    if (ringTip.y > ringPip.y) curledCount++;
                    if (pinkyTip.y > pinkyPip.y) curledCount++;

                    const isFist = curledCount >= 3;

                    // Toggle Logic with "Open Hand" Reset
                    // Only toggle if we are currently making a fist AND we were NOT making a fist recently (latch)
                    // Actually, simpler: 
                    // If Fist detected & Cooldown ready -> Toggle & Set Cooldown.

                    if (isFist && modeToggleCooldown === 0) {
                        isChordsMode = !isChordsMode;
                        modeToggleCooldown = 60; // 1 second debounce (assuming 60fps)
                        console.log("Mode Toggled:", isChordsMode ? "CHORDS" : "MELODY");
                    }

                    // 3. Pitch Bend Toggle (V-Sign / Peace Sign Gesture)
                    // Logic: Index and Middle extended, Ring and Pinky curled.
                    const isVsign = (indexTip.y < indexPip.y) &&
                        (middleTip.y < middlePip.y) &&
                        (ringTip.y > ringPip.y) &&
                        (pinkyTip.y > pinkyPip.y);

                    if (isVsign && bendToggleCooldown === 0) {
                        isPitchBendEnabled = !isPitchBendEnabled;
                        bendToggleCooldown = 60;
                        console.log("Pitch Bend:", isPitchBendEnabled ? "ENABLED" : "LOCKED");
                    }

                } else {
                    // --- RIGHT ZONE: NOTES (30% - 100%) ---
                    // Logic depends on Mode
                    if (isChordsMode) {
                        // CHORDS MODE: Play all extended fingers
                        const tipIds = [4, 8, 12, 16, 20];
                        // const pipIds = [2, 6, 10, 14, 18]; // PIP or MP for thumb

                        tipIds.forEach((tipId) => {
                            const tip = landmarks[tipId];
                            const tipX = 1.0 - tip.x; // Invert X for mirror logic

                            // Only map if tip is in zone
                            if (tipX > splitPoint) {
                                // Map tip.x from [0.3, 1.0] to [0, 1]
                                const normX = (tipX - splitPoint) / (1 - splitPoint);
                                // Increase horizontal padding to 10%
                                const padding = 0.10;
                                const normXAdjusted = (normX - padding) / (1 - 2 * padding);
                                const noteIndex = Math.floor(normXAdjusted * 14);
                                if (noteIndex >= 0 && noteIndex < 14) currentActiveNotes.add(noteIndex);
                            }
                        });
                    } else {
                        // MELODY MODE: Play ONLY on Pinch (Thumb + Index)
                        // X-axis selects base note, Z-axis bends pitch ±5 semitones
                        const thumb = landmarks[4];
                        const index = landmarks[8];
                        const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                        // Pinch Threshold
                        if (dist < 0.05) { // Pinch detected
                            const indexX = 1.0 - index.x; // Invert X
                            if (indexX > splitPoint) {
                                // Base note from X position
                                const normX = (indexX - splitPoint) / (1 - splitPoint);
                                // Increase horizontal padding to 10%
                                const padding = 0.10;
                                const normXAdjusted = (normX - padding) / (1 - 2 * padding);
                                const baseNoteIndex = Math.floor(normXAdjusted * 14);

                                if (baseNoteIndex >= 0 && baseNoteIndex < 14) {
                                    // Pitch bend from Z position (depth)
                                    const zNeutral = -0.1; // Calibrated neutral position
                                    const zRange = 0.15;   // Sensitivity
                                    const zOffset = index.z - zNeutral;
                                    const semitoneOffset = (zOffset / zRange) * -5; // Closer = higher pitch
                                    const clampedOffset = Math.max(-5, Math.min(5, semitoneOffset));

                                    if (isPitchBendEnabled) {
                                        pitchBendOffset = Math.round(clampedOffset);
                                        audio.setDetune(clampedOffset * 100);
                                    } else {
                                        pitchBendOffset = 0;
                                        audio.setDetune(0);
                                    }

                                    currentActiveNotes.add(baseNoteIndex);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Diff active notes to trigger Audio
        currentActiveNotes.forEach(idx => {
            if (!activeNotes.has(idx)) {
                audio.playNote(notes[idx]);
            }
        });

        activeNotes.forEach(idx => {
            if (!currentActiveNotes.has(idx)) {
                audio.stopNote(notes[idx]);
            }
        });

        activeNotes = currentActiveNotes;
        audio.setVolume(volume);

        // Reset detune if no notes are active in Melody Mode (optional but safer)
        if (activeNotes.size === 0 && !isChordsMode) {
            audio.setDetune(0);
        }

        // Update Visualizer with extra state
        visualizer.draw(results, Array.from(activeNotes), isChordsMode, volume, pitchBendOffset, hoveredNoteIndex, noteNames, isPitchBendEnabled);
    };

    const tracker = new HandTracker(videoElement, onResults);

    // Initialize Tracker (loads models)
    tracker.init();

    // Start Camera immediately
    tracker.start().then(() => {
        console.log("Camera started");
    }).catch(err => {
        console.error("Camera failed to start", err);
        loadingPanel.innerHTML = `<p>Error accessing camera: ${err.message}</p>`;
    });

    // Start Audio Button
    startBtn.addEventListener('click', async () => {
        startBtn.textContent = 'Loading Piano...';
        startBtn.disabled = true;
        try {
            await audio.init();
            audioInitialized = true;
            startBtn.textContent = 'Piano Ready ✓';
            startBtn.classList.add('active');
            console.log("Piano audio engine initialized!");
        } catch (error) {
            console.error("Failed to initialize audio:", error);
            startBtn.textContent = 'Audio Error';
        }
    });
});
