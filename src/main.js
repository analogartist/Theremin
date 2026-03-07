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

    // Constants
    const PINCH_THRESHOLD = 0.05;
    const LEFT_RIGHT_SPLIT = 0.3;
    const HOVER_PADDING = 0.10;

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
    let hoveredNoteIndex = null; // Index of note hand is over (for guidance)
    let showUI = true; // Toggle for key lines and labels
    let uiToggleCooldown = 0; // Debounce for the UI toggle
    let thumbsUpCounter = 0; // For triggering startup gesture
    const STARTUP_THRESHOLD = 45; // ~1.5 seconds at 30fps

    // Callback for when hand tracking results are available
    const onResults = (results) => {
        try {
            // Hide loading panel once we get the first result
            if (loadingPanel && loadingPanel.style.display !== 'none') {
                loadingPanel.style.display = 'none';
                controlsPanel.classList.remove('hidden');
                // Hide HTML overlay — canvas handles all UI from here
                const overlay = document.querySelector('.overlay');
                if (overlay) overlay.style.display = 'none';
            }

            // Update Cooldowns
            if (modeToggleCooldown > 0) modeToggleCooldown--;
            if (uiToggleCooldown > 0) uiToggleCooldown--;

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
                            if (indexX > LEFT_RIGHT_SPLIT) {
                                const normX = (indexX - LEFT_RIGHT_SPLIT) / (1 - LEFT_RIGHT_SPLIT);
                                const normXAdjusted = (normX - HOVER_PADDING) / (1 - 2 * HOVER_PADDING);
                                hoveredNoteIndex = Math.floor(normXAdjusted * 9);
                                if (hoveredNoteIndex < 0) hoveredNoteIndex = null;
                                if (hoveredNoteIndex >= 9) hoveredNoteIndex = null;
                            }
                        }

                        // Right-Hand UI Toggle (Fist Gesture)
                        const rTipIds = [8, 12, 16, 20];
                        const rPipIds = [6, 10, 14, 18];
                        let rCurledCount = 0;
                        rTipIds.forEach((id, idx) => {
                            if (landmarks[id] && landmarks[rPipIds[idx]] && landmarks[id].y > landmarks[rPipIds[idx]].y) rCurledCount++;
                        });

                        const isRightFist = rCurledCount >= 3;
                        if (isRightFist && uiToggleCooldown === 0) {
                            showUI = !showUI;
                            uiToggleCooldown = 60;
                            console.log("UI Visibility:", showUI ? "VISIBLE" : "HIDDEN");
                        }

                        // Startup Gesture Detection (Thumbs Up)
                        if (!audioInitialized) {
                            const thumbTip = landmarks[4];
                            const thumbIp = landmarks[3];
                            const fingerTips = [8, 12, 16, 20];
                            const fingerPips = [6, 10, 14, 18];

                            // Thumbs Up logic: Thumb is up, others are curled
                            const isThumbUp = thumbTip.y < thumbIp.y;
                            let fingerCurledCount = 0;
                            fingerTips.forEach((id, idx) => {
                                if (landmarks[id].y > landmarks[fingerPips[idx]].y) fingerCurledCount++;
                            });

                            if (isThumbUp && fingerCurledCount >= 3) {
                                thumbsUpCounter++;
                                if (thumbsUpCounter >= STARTUP_THRESHOLD) {
                                    initializeAudio();
                                }
                            } else {
                                thumbsUpCounter = Math.max(0, thumbsUpCounter - 2); // Rapid decay
                            }
                        }
                    }

                    const x = 1.0 - wrist.x;

                    if (x < LEFT_RIGHT_SPLIT) {
                        // --- LEFT ZONE: CONTROL (0% - 30%) ---
                        const thumb = landmarks[4];
                        const index = landmarks[8];
                        if (!thumb || !index) return;

                        // 1. Volume Control
                        const pinchDist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                        if (pinchDist < PINCH_THRESHOLD) {
                            if (volumeGrabY === null) {
                                volumeGrabY = wrist.y;
                                volumeGrabValue = volume;
                            } else {
                                const deltaY = volumeGrabY - wrist.y;
                                volume = Math.max(0, Math.min(1, volumeGrabValue + deltaY));
                            }
                        } else {
                            volumeGrabY = null;
                            volumeGrabValue = null;
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

                    } else {
                        // --- RIGHT ZONE: NOTES (30% - 100%) ---
                        if (isChordsMode) {
                            const tipIds = [4, 8, 12, 16, 20];
                            tipIds.forEach((tipId) => {
                                const tip = landmarks[tipId];
                                const tipX = 1.0 - tip.x;
                                if (tipX > LEFT_RIGHT_SPLIT) {
                                    const normX = (tipX - LEFT_RIGHT_SPLIT) / (1 - LEFT_RIGHT_SPLIT);
                                    const normXAdjusted = (normX - HOVER_PADDING) / (1 - 2 * HOVER_PADDING);
                                    const noteIndex = Math.floor(normXAdjusted * 9);
                                    if (noteIndex >= 0 && noteIndex < 9) currentActiveNotes.add(noteIndex);
                                }
                            });
                        } else {
                            const thumb = landmarks[4];
                            const index = landmarks[8];
                            const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                            if (dist < PINCH_THRESHOLD) {
                                const indexX = 1.0 - index.x;
                                if (indexX > LEFT_RIGHT_SPLIT) {
                                    const normX = (indexX - LEFT_RIGHT_SPLIT) / (1 - LEFT_RIGHT_SPLIT);
                                    const normXAdjusted = (normX - HOVER_PADDING) / (1 - 2 * HOVER_PADDING);
                                    const baseNoteIndex = Math.floor(normXAdjusted * 9);

                                    if (baseNoteIndex >= 0 && baseNoteIndex < 9) {
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

            // Update Visualizer
            const startupProgress = audioInitialized ? 1 : thumbsUpCounter / STARTUP_THRESHOLD;
            visualizer.draw(results, Array.from(activeNotes), isChordsMode, volume, hoveredNoteIndex, noteNames, showUI, audioInitialized, startupProgress);
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

    // Unified Audio Initialization
    async function initializeAudio() {
        if (audioInitialized) return;
        try {
            console.log("Initializing Audio Engine...");
            await audio.init();
            audioInitialized = true;
            console.log("Audio initialized successfully!");
        } catch (error) {
            console.error("Failed to initialize audio:", error);

            const notice = document.createElement('div');
            notice.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#00f2ff;padding:12px 24px;border-radius:8px;font-family:Outfit,sans-serif;font-size:16px;z-index:1000;pointer-events:none;';
            notice.textContent = 'Tap anywhere to enable audio';
            document.body.appendChild(notice);

            const fallbackHandler = async () => {
                try {
                    await audio.init();
                    audioInitialized = true;
                    notice.remove();
                    console.log("Audio initialized via fallback click!");
                } catch (e) {
                    console.error("Fallback initialization failed:", e);
                }
            };
            window.addEventListener('click', fallbackHandler, { once: true });
        }
    }
});
