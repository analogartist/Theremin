export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.activeOscillators = new Map(); // Map note frequency to oscillator node
        this.isPlaying = false;

        // B3 to B5 frequencies (approximate)
        // We can generate them or hardcode. 
        // B3 = 246.94
        // C4 = 261.63 ... 
        // B5 = 987.77
        // Let's generate a chromatic scale from B3
    }

    init() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5; // Default volume
        this.masterGain.connect(this.audioContext.destination);
    }

    async start() {
        if (!this.audioContext) this.init();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        this.isPlaying = true;
    }

    setVolume(vol) {
        if (this.masterGain) {
            // Smooth transition
            this.masterGain.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.1);
        }
    }

    playNote(frequency) {
        if (!this.audioContext || !this.isPlaying) return;

        // If note is already playing, do nothing (or retrigger?)
        if (this.activeOscillators.has(frequency)) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'triangle'; // Piano-ish? Sine is too pure. Triangle/Sawtooth + filter is better.
        osc.frequency.value = frequency;

        // ADSR Envelope
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.3); // Decay

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);

        this.activeOscillators.set(frequency, { osc, gain });
    }

    stopNote(frequency) {
        if (!this.activeOscillators.has(frequency)) return;

        const { osc, gain } = this.activeOscillators.get(frequency);
        const now = this.audioContext.currentTime;

        // Release
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.stop(now + 0.2);

        this.activeOscillators.delete(frequency);
    }

    stopAll() {
        this.activeOscillators.forEach(({ osc, gain }) => {
            const now = this.audioContext.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.stop(now + 0.1);
        });
        this.activeOscillators.clear();
    }
}
