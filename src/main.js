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

    // B3 to B5 Chromatic Scale (25 notes)
    // Formula: f = 440 * 2^((n-49)/12) where n is key number
    // B3 is ~246.94Hz. Let's just generate them.
    const baseFreq = 246.94;
    const notes = [];
    for (let i = 0; i < 24; i++) {
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

    // Callback for when hand tracking results are available
    const onResults = (results) => {
        // Hide loading panel once we get the first result
        if (loadingPanel.style.display !== 'none') {
            loadingPanel.style.display = 'none';
            controlsPanel.classList.remove('hidden');
        }

        // Update Cooldown
        if (modeToggleCooldown > 0) modeToggleCooldown--;

        // Process Hands
        const currentActiveNotes = new Set();
        // volume variable is now persistent in outer scope

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {

            // Separate hands by screen side
            // Screen Left (x < 0.35): Volume / Control
            // Screen Right (x > 0.35): Notes
            // Adjusted split point slightly to give more space/margin

            results.multiHandLandmarks.forEach((landmarks) => {
                const wrist = landmarks[0];

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
                                const noteIndex = Math.floor(normX * 24);
                                if (noteIndex >= 0 && noteIndex < 24) currentActiveNotes.add(noteIndex);
                            }
                        });
                    } else {
                        // MELODY MODE: Play ONLY on Pinch (Thumb + Index)
                        // Trigger note at Index Finger X position
                        const thumb = landmarks[4];
                        const index = landmarks[8];
                        const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                        // Pinch Threshold
                        if (dist < 0.05) { // Pinch detected
                            const indexX = 1.0 - index.x; // Invert X
                            if (indexX > splitPoint) {
                                const normX = (indexX - splitPoint) / (1 - splitPoint);
                                const noteIndex = Math.floor(normX * 24);
                                if (noteIndex >= 0 && noteIndex < 24) currentActiveNotes.add(noteIndex);
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

        // Update Visualizer with extra state
        visualizer.draw(results, Array.from(activeNotes), isChordsMode, volume);
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
        startBtn.textContent = 'Audio Active';
        startBtn.disabled = true;
        try {
            await audio.start();
            startBtn.classList.add('active');
        } catch (error) {
            console.error(error);
        }
    });
});
