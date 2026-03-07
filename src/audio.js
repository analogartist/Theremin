export class AudioEngine {
    constructor() {
        this.sampler = null;
        this.volumeNode = null; // Renamed to avoid confusion with the .volume property
        this.activeNotes = new Map(); // Map note name → true
        this.isInitialized = false;
    }

    async init() {
        // Start Tone.js audio context
        await Tone.start();

        // Create Sampler with Salamander Grand Piano samples
        this.sampler = new Tone.Sampler({
            urls: {
                A0: "A0.mp3",
                C1: "C1.mp3",
                "D#1": "Ds1.mp3",
                "F#1": "Fs1.mp3",
                A1: "A1.mp3",
                C2: "C2.mp3",
                "D#2": "Ds2.mp3",
                "F#2": "Fs2.mp3",
                A2: "A2.mp3",
                C3: "C3.mp3",
                "D#3": "Ds3.mp3",
                "F#3": "Fs3.mp3",
                A3: "A3.mp3",
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                A4: "A4.mp3",
                C5: "C5.mp3",
                "D#5": "Ds5.mp3",
                "F#5": "Fs5.mp3",
                A5: "A5.mp3",
                C6: "C6.mp3",
                "D#6": "Ds6.mp3",
                "F#6": "Fs6.mp3",
                A6: "A6.mp3",
                C7: "C7.mp3",
                "D#7": "Ds7.mp3",
                "F#7": "Fs7.mp3",
                A7: "A7.mp3",
                C8: "C8.mp3"
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/"
        });

        // Create volume control
        this.volumeNode = new Tone.Volume(0);

        // Connect sampler → volume → destination
        this.sampler.connect(this.volumeNode);
        this.volumeNode.toDestination();

        // Wait for samples to load
        await Tone.loaded();

        this.isInitialized = true;
        console.log("Piano samples loaded successfully!");
    }

    playNote(frequency) {
        if (!this.isInitialized || !this.sampler) return;

        // Convert frequency to note name (e.g., 440 → "A4")
        const note = Tone.Frequency(frequency, "hz").toNote();

        if (!this.activeNotes.has(note)) {
            this.sampler.triggerAttack(note);
            this.activeNotes.set(note, true);
        }
    }

    stopNote(frequency) {
        if (!this.isInitialized || !this.sampler) return;

        const note = Tone.Frequency(frequency, "hz").toNote();

        if (this.activeNotes.has(note)) {
            this.sampler.triggerRelease(note);
            this.activeNotes.delete(note);
        }
    }

    setVolume(vol) {
        if (!this.isInitialized || !this.volumeNode || !this.volumeNode.volume) return;

        try {
            // Convert 0-1 range to decibels (-60 to 0)
            const db = vol === 0 ? -60 : Tone.gainToDb(vol);
            this.volumeNode.volume.value = db;
        } catch (e) {
            console.error("AudioEngine: Error setting volume", e);
            throw e; // Propagate for stack trace
        }
    }

    stopAll() {
        if (!this.isInitialized || !this.sampler) return;

        this.activeNotes.forEach((_, note) => {
            this.sampler.triggerRelease(note);
        });
        this.activeNotes.clear();
    }
}
