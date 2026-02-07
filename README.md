# Air Piano - Virtual Theremin Hybrid

An innovative musical instrument that transforms hand gestures into sound using computer vision. Play music in the air with intuitive gesture controls—no physical contact required.

## Features

- 🎹 **Air Piano Mode**: Play chromatic notes (B3-B5) by moving your hand
- 🎵 **Dual Modes**: Toggle between Melody (single-note) and Chords (polyphonic)
- 🔊 **Gesture Volume Control**: Pinch-to-slide volume adjustment
- 👐 **Two-Hand Control**: Dedicated zones for expression and performance
- 🎨 **Real-time Visual Feedback**: See your hands, active notes, and volume levels

## Quick Start

### Prerequisites

- Modern web browser (Chrome/Edge recommended for best performance)
- Webcam access
- Python 3 (for local server)

### Running the Application

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd App-X-1
   ```

2. **Start a local server**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser**
   - Navigate to `http://localhost:8000`
   - Grant camera permissions when prompted
   - Click "Start Audio" to begin

## How to Play

### Screen Layout

```
┌─────────────────┬──────────────────────────────────────────┐
│   LEFT 30%      │          RIGHT 70%                       │
│   (Control)     │          (Piano Keys)                    │
│                 │                                          │
│  Volume Bar     │  [Key1][Key2][Key3]...[Key24]           │
│  Mode Toggle    │  B3 ─────────────────────► B5           │
│                 │                                          │
└─────────────────┴──────────────────────────────────────────┘
```

### Gesture Controls

#### Left Hand (Control Zone - 30%)

**Volume Control:**
- **Pinch** your thumb and index finger together
- Move hand **up/down** while pinching to adjust volume
- **Release** to lock the volume at current level
- Visual feedback via volume bar on screen

**Mode Toggle:**
- Make a **FIST** (curl 3+ fingers) to toggle modes
- **Melody Mode** (Blue): Play single notes with pinch
- **Chords Mode** (Red): Play multiple notes with all fingers

#### Right Hand (Piano Zone - 70%)

**Melody Mode:**
- **Pinch** thumb and index finger
- Move hand left/right to select notes
- Notes play only while pinching

**Chords Mode:**
- Extend fingers over the piano zone
- Each finger triggers a note based on horizontal position
- Play full chords with multiple fingers

## Architecture

### Tech Stack

- **Vision**: MediaPipe Hands (via CDN)
- **Audio**: Web Audio API (polyphonic synthesis)
- **Rendering**: HTML5 Canvas
- **Styling**: Vanilla CSS with modern effects

### File Structure

```
App-X-1/
├── index.html          # Main entry point
├── src/
│   ├── main.js         # Application logic & gesture processing
│   ├── audio.js        # Polyphonic audio engine
│   ├── vision.js       # MediaPipe Hands integration
│   ├── visuals.js      # Canvas rendering & visual feedback
│   └── style.css       # UI styling
├── docs/               # Additional documentation
├── README.md           # This file
└── DEVELOPMENT.md      # Developer guide
```

## Known Issues & Roadmap

See [DEVELOPMENT.md](./DEVELOPMENT.md) for:
- Current implementation status
- Known bugs and limitations
- Planned features
- How to contribute

## Browser Compatibility

- ✅ Chrome 90+ (Recommended)
- ✅ Edge 90+
- ⚠️ Firefox 88+ (MediaPipe performance may vary)
- ❌ Safari (Limited MediaPipe support)

## License

[Your License Here]

## Credits

Built with:
- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
