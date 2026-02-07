export class Visualizer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.particles = [];

        // Define Key Zones (B3 to E5)
        // 1.5 octaves = 18 chromatic notes
        this.keys = [];
        this.numKeys = 18;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Recalculate key positions
        // Right 70% of screen starts at 0.3 * width
        const keyAreaStart = this.width * 0.30;
        const keyAreaWidth = this.width * 0.70;
        const keyWidth = keyAreaWidth / this.numKeys;

        this.keys = [];
        for (let i = 0; i < this.numKeys; i++) {
            this.keys.push({
                x: keyAreaStart + (i * keyWidth),
                width: keyWidth,
                noteIndex: i,
                active: false
            });
        }
    }

    draw(results, activeNotes = [], isChordsMode = false, volume = 0.5) {
        // Clear
        this.ctx.fillStyle = 'rgba(15, 15, 19, 0.2)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Split Line
        this.ctx.beginPath();
        this.ctx.moveTo(this.width * 0.30, 0);
        this.ctx.lineTo(this.width * 0.30, this.height);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw Labels & Mode
        this.ctx.font = '20px Outfit';
        this.ctx.fillStyle = 'rgba(255, 0, 85, 0.5)';
        this.ctx.fillText("VOLUME / MODE", this.width * 0.05, 50);

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

        this.ctx.fillStyle = 'rgba(0, 242, 255, 0.5)';
        this.ctx.fillText("PIANO KEYS", this.width * 0.4, 50);

        // Draw Keys
        this.keys.forEach((key, index) => {
            const isActive = activeNotes.includes(index);

            this.ctx.fillStyle = isActive ? 'rgba(0, 242, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)';
            this.ctx.fillRect(key.x, 0, key.width - 2, this.height); // -2 for gap

            if (isActive) {
                // Glow effect
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = '#00f2ff';
                this.ctx.fillStyle = 'rgba(0, 242, 255, 0.8)';
                this.ctx.fillRect(key.x, 0, key.width - 2, this.height);
                this.ctx.shadowBlur = 0;
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
                this.addParticles(x, y);

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
}
