# Air Piano Development Guide

This guide is for developers maintaining or extending the Air Piano project.

## Current State: High-Quality MVP

The project is currently in a stable, polished state with professional audio quality and expressive gesture controls. All previously identified high-priority issues (Volume Locking, Mirrored Text, Sound Quality, Zoning) have been resolved.

### ✅ Implemented Features

- **Audio Engine (Tone.js)**: Professional sample-based playback using Salamander Grand Piano. Natural sustain, decay, and polyphony.
- **Expressive Gestures**:
  - **Pinch-to-Slide Volume**: Relative motion adjustment with locking.
  - **Fist Mode Toggle**: Robust toggle between Melody and Chords.
- **Visual System**:
  - **Strict Zoning**: 30/70 split with stylized dotted line.
  - **Zoning Enforcement**: Visual backgrounds highlight hand presence and blink warning (⚠️) if hands cross zones.
  - **Mirror Mode Fix**: All coordinates manually inverted for correct UI/Text rendering.
- **Instrument Design**:
  - **1.5 Octave Layout**: 18 keys (B3-E5) for optimized spacing and targeting.
  - **Mode-Specific Particles**: Blue (Melody) and Red (Chords) feedback.

---

## Architecture Details

### Data Flow
```
Camera Feed → MediaPipe Hands → Landmarks (3D: x, y, z)
                                      ↓
                            Mirror Coordinates (1-x)
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
            Left Zone (x < 0.3)              Right Zone (x > 0.3)
                    ↓                                   ↓
        Volume Control + Mode Toggle              Note Control
                    ↓                                   ↓
                    └─────────────────┬─────────────────┘
                                      ↓
                            Tone.js & Visualizer
```

### Key Modules

- **`src/main.js`**: Orchestrates state (volume, mode) and maps hand data to audio events.
  - *Key Variables*: `volume`, `isChordsMode`.
- **`src/audio.js`**: Manages the Tone.js Sampler. Handles frequency-to-note mapping and ADSR envelopes.
- **`src/visuals.js`**: Canvas renderer. Handles zone backgrounds, warnings, particles, and key highlights.
- **`src/vision.js`**: MediaPipe Hands wrapper.

---

## Maintenance & Testing

### Calibration Checklist
- **Volume**: Should stay locked when pinch is released.
- **Toggle**: Fist requires 3+ fingers curled. Cooldown is 1 second (60 frames).

### Performance Tips
- If lagging, reduce `particle` count in `visuals.js` or lower `maxNumHands` in `vision.js`.
- Tone.js samples (~500KB) are cached by the browser after first load.

---

## Future Roadmap

1. **User Calibration UI**: A button to let users set their own "Neutral Depth" and "Pinch Strength".
2. **Scales Support**: Toggle between Chromatic, Major, Minor, and Pentatonic scales.
3. **Recording**: Save performances as WAV or MIDI files.
4. **Visual Themes**: Dynamic backgrounds that react to the music.

---

**Last Updated**: 2026-02-07
**Pausing Point**: Visual Polish & Zoning Complete. (Commit `1086d12` + Final Polish)
