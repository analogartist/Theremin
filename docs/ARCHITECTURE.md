# Architecture Overview

Visual guide to understanding the Air Piano codebase structure and data flow.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                    (Hand Gestures)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      WEBCAM                                  │
│                  (Video Stream)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               MediaPipe Hands                                │
│          (vision.js - HandTracker)                           │
│                                                              │
│  • Detects up to 2 hands                                    │
│  • Returns 21 landmarks per hand                            │
│  • Normalized coordinates (0-1)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Coordinate Mirroring                            │
│                 (main.js)                                    │
│                                                              │
│  • Inverts X coordinates: x = 1 - x                         │
│  • Ensures mirror-like interaction                          │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  LEFT ZONE       │   │  RIGHT ZONE      │
│  (x < 0.3)       │   │  (x > 0.3)       │
│                  │   │                  │
│  • Volume Control│   │  • Note Trigger  │
│  • Mode Toggle   │   │  • Melody/Chords │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         │                      │
         └──────────┬───────────┘
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Audio Engine                               │
│                   (audio.js)                                 │
│                                                              │
│  • Web Audio API                                            │
│  • Polyphonic synthesis                                     │
│  • ADSR envelopes                                           │
│  • Volume control                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Visualizer                                │
│                  (visuals.js)                                │
│                                                              │
│  • Canvas rendering                                         │
│  • Hand skeleton overlay                                    │
│  • Volume bar                                               │
│  • Piano keys                                               │
│  • Particles                                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  SPEAKERS                                    │
│                 (Audio Output)                               │
└─────────────────────────────────────────────────────────────┘
```

## File Responsibilities

### `index.html`
- Entry point
- Canvas and video elements
- UI controls (Start button)
- CDN script imports

### `src/main.js` (Orchestrator)
**Purpose:** Application logic and gesture coordination

**Key Responsibilities:**
- Initialize modules (AudioEngine, HandTracker, Visualizer)
- Process hand landmarks from MediaPipe
- Zone detection (left vs right)
- Gesture recognition (pinch, fist)
- State management (volume, mode, active notes)
- Sync audio and visuals

**State Variables:**
```javascript
activeNotes: Set<number>     // Currently playing note indices
isChordsMode: boolean         // Melody vs Chords
volume: number                // Current volume (0-1)
modeToggleCooldown: number    // Debounce counter
```

### `src/audio.js` (Sound Generation)
**Purpose:** Polyphonic audio synthesis

**Key Responsibilities:**
- Manage Web Audio API context
- Create/destroy oscillators for each note
- Apply ADSR envelopes
- Control master volume

**Data Structures:**
```javascript
activeOscillators: Map<frequency, {osc, gain}>
```

**Note:** Each note gets its own oscillator + gain node for independent control.

### `src/vision.js` (Hand Tracking)
**Purpose:** MediaPipe Hands integration

**Key Responsibilities:**
- Initialize MediaPipe Hands model
- Connect to webcam
- Process video frames
- Emit landmark results to callback

**Configuration:**
- `maxNumHands: 2`
- `minDetectionConfidence: 0.5`
- `minTrackingConfidence: 0.5`

### `src/visuals.js` (Rendering)
**Purpose:** Canvas-based visual feedback

**Key Responsibilities:**
- Clear and redraw canvas each frame
- Render zone divider
- Draw piano keys (24 chromatic notes)
- Highlight active notes
- Display volume bar
- Show mode indicator
- Draw hand skeletons
- Animate particles

**Render Order:**
1. Clear canvas
2. Draw static UI (zones, keys, labels)
3. Draw dynamic elements (hands, particles)
4. Update volume/mode indicators

### `src/style.css` (Aesthetics)
**Purpose:** Modern UI styling

**Key Features:**
- Dark theme (`--bg-color: #0f0f13`)
- Glassmorphism effects
- Gradient text (accent colors)
- Responsive controls

## Data Structures

### Landmarks (from MediaPipe)
```javascript
{
  multiHandLandmarks: [
    [ // Hand 1
      {x: 0.5, y: 0.3, z: -0.1},  // Landmark 0 (Wrist)
      {x: 0.51, y: 0.25, z: -0.09}, // Landmark 1
      // ... 21 total landmarks per hand
    ],
    [ // Hand 2 (if present)
      // ...
    ]
  ]
}
```

### Active Notes
```javascript
// Set of note indices (0-23)
activeNotes: Set<0, 5, 12>  // Example: Playing 3 notes
```

### Audio Oscillators
```javascript
// Map frequency → {oscillator, gainNode}
activeOscillators: Map {
  246.94 => {osc: OscillatorNode, gain: GainNode},
  293.66 => {osc: OscillatorNode, gain: GainNode}
}
```

## Key Algorithms

### Coordinate Mirroring
```javascript
// Input: MediaPipe normalized coordinates (0-1)
// Output: Mirrored for natural interaction
x_display = 1.0 - x_input
```

**Why?** Without mirroring, moving your left hand left would move the cursor right.

### Zone Detection
```javascript
if (x < splitPoint) {
  // LEFT ZONE: Control
} else {
  // RIGHT ZONE: Piano
}
```

### Pinch Detection
```javascript
const dist = √((thumb.x - index.x)² + (thumb.y - index.y)²)
isPinched = dist < 0.05
```

### Fist Detection
```javascript
curledCount = 0
for each finger in [index, middle, ring, pinky]:
  if tip.y > pip.y:  // Tip below PIP joint
    curledCount++

isFist = curledCount >= 3
```

### Note Mapping
```javascript
// Map X position (0.3 to 1.0) to note index (0-23)
normX = (x - 0.3) / 0.7
noteIndex = floor(normX * 24)
frequency = notes[noteIndex]
```

## Performance Considerations

### Frame Rate
- Target: 60 FPS
- MediaPipe runs at ~30 FPS
- Visual updates: Every animation frame
- Audio: Event-driven (note on/off)

### Optimization Points
1. **Particle System**: Limit to 100 active particles
2. **Canvas Clearing**: Use semi-transparent rect vs full clear
3. **Oscillator Reuse**: Stop/start vs destroy/create
4. **Event Debouncing**: Cooldown on mode toggle

### Memory Management
- Oscillators cleaned up on note stop
- Particles array pruned when life expires
- No memory leaks in current implementation

## Extension Points

Want to add features? Here are the best places:

### New Gestures
- `src/main.js` lines 73-155 (gesture processing)
- Add new detection logic alongside pinch/fist

### New Sounds
- `src/audio.js` line 49 (oscillator type)
- Change from `triangle` to `sine`, `square`, `sawtooth`

### New Scales
- `src/main.js` lines 17-24 (note generation)
- Replace chromatic with major/minor/pentatonic

### UI Themes
- `src/style.css` lines 1-9 (CSS variables)
- Modify colors, fonts, effects

---

**Back to:** [README.md](../README.md) | [DEVELOPMENT.md](../DEVELOPMENT.md)
