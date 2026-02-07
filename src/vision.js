export class HandTracker {
    constructor(videoElement, onResultsCallback) {
        this.videoElement = videoElement;
        this.onResultsCallback = onResultsCallback;
        this.hands = null;
        this.camera = null;
    }

    init() {
        console.log("HandTracker: Initializing...");
        if (!window.Hands) {
            console.error("HandTracker: window.Hands is not defined. Script not loaded?");
            return;
        }

        // Initialize MediaPipe Hands
        this.hands = new window.Hands({
            locateFile: (file) => {
                console.log(`HandTracker: Loading file: ${file}`);
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2, // Allow both hands so either can be used
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResultsCallback);

        if (!window.Camera) {
            console.error("HandTracker: window.Camera is not defined. Script not loaded?");
            return;
        }

        // Initialize Camera
        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 1280,
            height: 720
        });
    }

    start() {
        return this.camera.start();
    }
}
