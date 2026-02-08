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
    const noteNames = ["B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
    // Semitone offsets from B for natural scale: B(0), C(1), D(3), E(5), F(6), G(8), A(10), B(12), C(13)
    const naturalOffsets = [0, 1, 3, 5, 6, 8, 10, 12, 13];
    for (let i = 0; i < 9; i++) {
        notes.push(baseFreq * Math.pow(2, naturalOffsets[i] / 12));
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
        try {
            // Hide loading panel once we get the first result
            if (loadingPanel && loadingPanel.style.display !== 'none') {
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
                    if (!results.multiHandedness || !results.multiHandedness[i]) return;

                    const label = results.multiHandedness[i].label; // 'Left' or 'Right'
                    const wrist = landmarks[0];
                    if (!wrist) return;

                    const wristX = 1.0 - wrist.x;

                    // Track "hover" for right hand (targeting feedback)
                    const isRightHand = (label === 'Left' || label === 'left' || wristX >= 0.35);
                    if (isRightHand) {
                        const index = landmarks[8];
                        if (index) {
                            const indexX = 1.0 - index.x;
                            const splitPoint = 0.3;
                            if (indexX > splitPoint) {
                                const normX = (indexX - splitPoint) / (1 - splitPoint);
                                // Increase horizontal padding to 10% for better edge reliability
                                const padding = 0.10;
                                const normXAdjusted = (normX - padding) / (1 - 2 * padding);
                                hoveredNoteIndex = Math.floor(normXAdjusted * 9);
                                if (hoveredNoteIndex < 0) hoveredNoteIndex = null;
                                if (hoveredNoteIndex >= 9) hoveredNoteIndex = null;
                            }
                        }
                    }

                    // Strict 30% / 70% Split
                    const splitPoint = 0.3;
                    const x = 1.0 - wrist.x;

                    if (x < splitPoint) {
                        // --- LEFT ZONE: CONTROL (0% - 30%) ---
                        const thumb = landmarks[4];
                        const index = landmarks[8];
                        if (!thumb || !index) return;

                        // 1. Volume Control
                        const pinchDist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                        if (pinchDist < 0.05) {
                            if (volumeGrabY === null) {
                                volumeGrabY = wrist.y;
                                volumeGrabValue = volume;
                            } else {
                                const deltaY = volumeGrabY - wrist.y;
                                volume = Math.max(0, Math.min(1, volumeGrabValue + deltaY));
                            }
                        } else {
                            volumeGrabY = null;
                            volumeGrabValue = volume;
                        }

                        // 2. Mode Toggle (Fist)
                        const tipIds = [8, 12, 16, 20];
                        const pipIds = [6, 10, 14, 18];
                        let curledCount = 0;
                        tipIds.forEach((id, idx) => {
                            if (landmarks[id].y > landmarks[pipIds[idx]].y) curledCount++;
                        });

                        const isFist = curledCount >= 3;
                        if (isFist && modeToggleCooldown === 0) {
                            isChordsMode = !isChordsMode;
                            modeToggleCooldown = 60;
                        }

                        // 3. Pitch Bend Toggle (V-Sign)
                        const distWristIndexTip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[8].x, 2) + Math.pow(landmarks[0].y - landmarks[8].y, 2));
                        const distWristIndexPip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[6].x, 2) + Math.pow(landmarks[0].y - landmarks[6].y, 2));
                        const distWristMiddleTip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[12].x, 2) + Math.pow(landmarks[0].y - landmarks[12].y, 2));
                        const distWristMiddlePip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[10].x, 2) + Math.pow(landmarks[0].y - landmarks[10].y, 2));
                        const distWristRingTip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[16].x, 2) + Math.pow(landmarks[0].y - landmarks[16].y, 2));
                        const distWristRingPip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[14].x, 2) + Math.pow(landmarks[0].y - landmarks[14].y, 2));
                        const distWristPinkyTip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[20].x, 2) + Math.pow(landmarks[0].y - landmarks[20].y, 2));
                        const distWristPinkyPip = Math.sqrt(Math.pow(landmarks[0].x - landmarks[18].x, 2) + Math.pow(landmarks[0].y - landmarks[18].y, 2));

                        const isIndexExtended = distWristIndexTip > distWristIndexPip * 1.15;
                        const isMiddleExtended = distWristMiddleTip > distWristMiddlePip * 1.15;
                        const isRingCurled = distWristRingTip < distWristRingPip;
                        const isPinkyCurled = distWristPinkyTip < distWristPinkyPip;

                        const isVsign = isIndexExtended && isMiddleExtended && isRingCurled && isPinkyCurled;

                        if (isVsign && bendToggleCooldown === 0) {
                            isPitchBendEnabled = !isPitchBendEnabled;
                            bendToggleCooldown = 60;
                        }

                    } else {
                        // --- RIGHT ZONE: NOTES (30% - 100%) ---
                        if (isChordsMode) {
                            const tipIds = [4, 8, 12, 16, 20];
                            tipIds.forEach((tipId) => {
                                const tip = landmarks[tipId];
                                const tipX = 1.0 - tip.x;
                                if (tipX > splitPoint) {
                                    const normX = (tipX - splitPoint) / (1 - splitPoint);
                                    const padding = 0.10;
                                    const normXAdjusted = (normX - padding) / (1 - 2 * padding);
                                    const noteIndex = Math.floor(normXAdjusted * 9);
                                    if (noteIndex >= 0 && noteIndex < 9) currentActiveNotes.add(noteIndex);
                                }
                            });
                        } else {
                            const thumb = landmarks[4];
                            const index = landmarks[8];
                            const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                            if (dist < 0.05) {
                                const indexX = 1.0 - index.x;
                                if (indexX > splitPoint) {
                                    const normX = (indexX - splitPoint) / (1 - splitPoint);
                                    const padding = 0.10;
                                    const normXAdjusted = (normX - padding) / (1 - 2 * padding);
                                    const baseNoteIndex = Math.floor(normXAdjusted * 9);

                                    if (baseNoteIndex >= 0 && baseNoteIndex < 9) {
                                        const zNeutral = -0.1;
                                        const zRange = 0.15;
                                        const zOffset = index.z - zNeutral;
                                        const semitoneOffset = (zOffset / zRange) * -5;
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

            // Audio Updates
            currentActiveNotes.forEach(idx => {
                if (!activeNotes.has(idx)) audio.playNote(notes[idx]);
            });
            activeNotes.forEach(idx => {
                if (!currentActiveNotes.has(idx)) audio.stopNote(notes[idx]);
            });

            activeNotes = currentActiveNotes;
            audio.setVolume(volume);

            if (activeNotes.size === 0 && !isChordsMode) {
                audio.setDetune(0);
            }

            // Update Visualizer
            visualizer.draw(results, Array.from(activeNotes), isChordsMode, volume, pitchBendOffset, hoveredNoteIndex, noteNames, isPitchBendEnabled);
        } catch (e) {
            console.error("CRITICAL ERROR in onResults:", e);
            throw e; // Rethrow to trigger unhandledrejection catcher with stack
        }
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
