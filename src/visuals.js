export class Visualizer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.keys = [];
        this.numKeys = 9;
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.particles = [];
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Recalculate key positions
        // Right 70% of screen starts at 0.3 * width
        const splitPointRatio = 0.30;
        const paddingRatio = 0.10; // 10% horizontal padding on each side for better tracking reliability

        const keyAreaStartFull = this.width * splitPointRatio;
        const keyAreaWidthFull = this.width * (1 - splitPointRatio);

        // Calculate insets
        const insetX = keyAreaWidthFull * paddingRatio;
        const keyAreaStartPadded = keyAreaStartFull + insetX;
        const keyAreaWidthPadded = keyAreaWidthFull - (2 * insetX);
        const keyWidth = keyAreaWidthPadded / this.numKeys;

        this.keys = [];
        for (let i = 0; i < this.numKeys; i++) {
            this.keys.push({
                x: keyAreaStartPadded + (i * keyWidth),
                width: keyWidth,
                noteIndex: i,
                active: false
            });
        }
    }

    draw(results, activeNotes = [], isChordsMode = false, volume = 0.5, pitchBendOffset = 0, hoveredNoteIndex = null, noteNames = [], isPitchBendEnabled = true, showUI = true, audioInitialized = false, startupProgress = 0) {
        // Clear
        this.ctx.fillStyle = 'rgba(15, 15, 19, 0.4)'; // Slightly darker for startup
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Core Interaction Layer
        if (!audioInitialized) {
            this.drawStartupOverlay(startupProgress);
            return; // Don't draw piano until ready
        }

        // Draw Zone Backgrounds (Subtle highlights when hand is present)
        const splitX = this.width * 0.30;
        let leftHandInLeftZone = false;
        let rightHandInRightZone = false;
        let leftHandInWrongZone = false;
        let rightHandInWrongZone = false;

        if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandLandmarks.forEach((landmarks, i) => {
                const label = results.multiHandedness[i].label; // 'Left' or 'Right'
                const wrist = landmarks[0];
                const wristX = 1.0 - wrist.x;

                if (label === 'Right' || label === 'right') { // MediaPipe 'Right' is User 'Left'
                    if (wristX < 0.3) {
                        leftHandInLeftZone = true;
                    } else {
                        leftHandInWrongZone = true;
                    }
                } else if (label === 'Left' || label === 'left') { // MediaPipe 'Left' is User 'Right'
                    if (wristX >= 0.3) {
                        rightHandInRightZone = true;
                    } else {
                        rightHandInWrongZone = true;
                    }
                }
            });
        } else if (results.multiHandLandmarks) {
            // Fallback if multiHandedness is missing
            results.multiHandLandmarks.forEach((landmarks) => {
                const wristX = 1.0 - landmarks[0].x;
                if (wristX < 0.3) leftHandInLeftZone = true;
                else rightHandInRightZone = true;
            });
        }

        // Draw Left Zone BG
        this.ctx.fillStyle = leftHandInWrongZone ? 'rgba(255, 0, 0, 0.1)' : (leftHandInLeftZone ? 'rgba(255, 0, 85, 0.05)' : 'rgba(255, 255, 255, 0.02)');
        this.ctx.fillRect(0, 0, splitX, this.height);

        // Draw Right Zone BG
        this.ctx.fillStyle = rightHandInWrongZone ? 'rgba(255, 0, 0, 0.1)' : (rightHandInRightZone ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)');
        this.ctx.fillRect(splitX, 0, this.width - splitX, this.height);

        // Draw Split Line (Enhanced)
        if (showUI) {
            const gradient = this.ctx.createLinearGradient(splitX, 0, splitX, this.height);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'transparent');

            this.ctx.beginPath();
            this.ctx.moveTo(splitX, 0);
            this.ctx.lineTo(splitX, this.height);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([5, 15]); // Dotted line for split
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset dash
        }

        // Draw Warning if hand in wrong zone
        if (leftHandInWrongZone || rightHandInWrongZone) {
            this.ctx.font = 'bold 16px Outfit';
            this.ctx.fillStyle = '#ff4444';
            if (leftHandInWrongZone) this.ctx.fillText("⚠️ LEFT HAND TOO FAR RIGHT", 20, this.height - 20);
            if (rightHandInWrongZone) this.ctx.fillText("⚠️ RIGHT HAND TOO FAR LEFT", splitX + 20, this.height - 20);
        }

        // Draw Labels & Mode
        if (showUI) {
            this.ctx.font = '20px Outfit';
            this.ctx.fillStyle = 'rgba(255, 0, 85, 0.5)';
            this.ctx.fillText("VOLUME / MODE", this.width * 0.05, 50);
        }

        // Draw Volume Bar
        const volBarHeight = 200;
        const volBarWidth = 20;
        const volBarX = this.width * 0.05;
        const volBarY = this.height * 0.4;

        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(volBarX, volBarY, volBarWidth, volBarHeight);

        // Level
        const levelHeight = volume * volBarHeight;
        this.ctx.fillStyle = '#ff0080';
        this.ctx.fillRect(volBarX, volBarY + (volBarHeight - levelHeight), volBarWidth, levelHeight);

        // Label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Outfit';
        this.ctx.fillText(`${Math.round(volume * 100)}%`, volBarX, volBarY + volBarHeight + 20);

        // Mode Indicator
        this.ctx.font = 'bold 30px Outfit';
        this.ctx.fillStyle = isChordsMode ? '#ff0055' : '#00f2ff';
        this.ctx.fillText(isChordsMode ? "MODE: CHORDS" : "MODE: MELODY", this.width * 0.05, 100);
        this.ctx.font = '16px Outfit';
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.fillText(isChordsMode ? "(Fist to Toggle)" : "(Fist to Toggle)", this.width * 0.05, 130);
        this.ctx.fillText(isChordsMode ? "All Fingers Play" : "Pinch to Play", this.width * 0.05, 150);

        if (showUI) {
            this.ctx.fillStyle = 'rgba(0, 242, 255, 0.5)';
            this.ctx.fillText("PIANO KEYS", this.width * 0.4, 50);
        }

        // Pitch Bend Indicator (Melody Mode only)
        if (!isChordsMode) {
            this.ctx.font = 'bold 20px Outfit';
            this.ctx.fillStyle = isPitchBendEnabled ? '#00f2ff' : 'rgba(255,255,255,0.3)';
            const statusLabel = isPitchBendEnabled ? "BEND: READY ✌️" : "BEND: LOCKED 🔒";
            this.ctx.fillText(statusLabel, this.width * 0.65, 80);

            if (showUI) {
                this.ctx.font = '12px Outfit';
                this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
                this.ctx.fillText("Left Hand Peace Sign to Toggle", this.width * 0.65, 105);
            }

            if (isPitchBendEnabled && pitchBendOffset !== 0) {
                const bendText = pitchBendOffset > 0 ? `+${pitchBendOffset}` : `${pitchBendOffset}`;
                this.ctx.font = 'bold 36px Outfit';
                this.ctx.fillStyle = '#00f2ff';
                this.ctx.fillText(`BEND: ${bendText}`, this.width * 0.65, 50);

                // Add a dynamic glow around the value
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#00f2ff';
                this.ctx.fillText(`BEND: ${bendText}`, this.width * 0.65, 50);
                this.ctx.shadowBlur = 0;
            }
        }

        // Draw Keys
        this.keys.forEach((key, index) => {
            const isActive = activeNotes.includes(index);
            const isHovered = (hoveredNoteIndex === index);

            // 1. Hover Highlight (Subtle)
            if (isHovered && !isActive) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                this.ctx.fillRect(key.x, 0, key.width - 2, this.height);
            }

            // 2. Background / Active Key
            if (isActive) {
                this.ctx.fillStyle = isChordsMode ? 'rgba(255, 0, 85, 0.4)' : 'rgba(0, 242, 255, 0.4)';
                this.ctx.fillRect(key.x, 0, key.width - 2, this.height); // -2 for gap

                // Glow effect (Mode-Specific)
                const glowColor = isChordsMode ? '#ff0055' : '#00f2ff';
                this.ctx.shadowBlur = 30;
                this.ctx.shadowColor = glowColor;
                this.ctx.fillRect(key.x, 0, key.width - 2, this.height);
                this.ctx.shadowBlur = 0;
            } else if (showUI) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                this.ctx.fillRect(key.x, 0, key.width - 2, this.height);
            }

            // 3. Vertical Guideline (Divider)
            if (showUI && index < this.numKeys - 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(key.x + key.width - 1, 0); // Full height for better visibility
                this.ctx.lineTo(key.x + key.width - 1, this.height);
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Prominent divider
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // 4. Note Label
            if (showUI && noteNames && noteNames.length > 0) {
                const name = noteNames[index] || `N${index}`;
                // Highlight color for the hovered note name
                const labelColor = isActive ? '#ffffff' : (isHovered ? '#00f2ff' : 'rgba(255, 255, 255, 0.7)');
                this.ctx.fillStyle = labelColor;
                this.ctx.font = isHovered ? 'bold 16px Outfit' : '12px Outfit';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(name, key.x + key.width / 2, this.height - 40); // Move up a bit more
                this.ctx.textAlign = 'start'; // reset
            }
        });

        // Draw Hands & Particles
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            results.multiHandLandmarks.forEach((landmarks, index) => {
                // Determine if Left or Right hand based on X position roughly
                // Actually we pass sorted hands from Main, but here we get raw results.
                // We'll just draw. Main handles logic.

                const indexTip = landmarks[8];
                // Mirror visual output manually: x = 1.0 - x
                const x = (1.0 - indexTip.x) * this.width;
                const y = indexTip.y * this.height;

                this.drawSkeleton(landmarks);
                const particleColor = isChordsMode ? '#ff0055' : '#00f2ff';
                this.addParticles(x, y, particleColor);

                // Highlight all fingertips for Right Hand logic
                // Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20)
                const fingertips = [4, 8, 12, 16, 20];
                fingertips.forEach(id => {
                    const tip = landmarks[id];
                    // Mirror visual output manually: x = 1.0 - x
                    const tx = (1.0 - tip.x) * this.width;
                    const ty = tip.y * this.height;

                    this.ctx.beginPath();
                    this.ctx.arc(tx, ty, 8, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fill();
                });
            });
        }

        this.updateParticles();
    }

    // Helper methods (drawSkeleton, addParticles, updateParticles) same as before...
    // I'll skip re-writing them mostly, but need to include them for completeness if overwriting file.
    // Since I'm overwriting, I must include them.

    drawSkeleton(landmarks) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (const landmark of landmarks) {
            // Mirror visual output manually: x = 1.0 - x
            const lx = (1.0 - landmark.x) * this.width;
            const ly = landmark.y * this.height;
            this.ctx.beginPath();
            this.ctx.arc(lx, ly, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    addParticles(x, y, color = '#00f2ff') {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: color
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.life * 5, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life;
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            }
        }
    }

    drawStartupOverlay(progress) {
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 1. Progress Ring
        const radius = 80;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 10;
        this.ctx.stroke();

        if (progress > 0) {
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * progress));
            this.ctx.strokeStyle = '#00f2ff';
            this.ctx.lineWidth = 10;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // Glow
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00f2ff';
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // 2. Icon / Instruction
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '60px Outfit';
        this.ctx.fillText("👍", cx, cy + 20);

        this.ctx.font = 'bold 24px Outfit';
        const alpha = 0.5 + Math.sin(Date.now() / 300) * 0.3;
        this.ctx.fillStyle = `rgba(0, 242, 255, ${alpha})`;
        this.ctx.fillText("RIGHT HAND THUMBS-UP TO START", cx, cy + 130);

        this.ctx.font = '16px Outfit';
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.fillText("Hold for 1 second", cx, cy + 160);

        this.ctx.textAlign = 'start'; // reset
    }
}
