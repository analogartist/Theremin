# Development Guide

This document provides detailed information for developers continuing work on the Air Piano project.

## Current Implementation Status

### ✅ Completed Features

- [x] **Core Architecture**
  - MediaPipe Hands integration (2-hand tracking)
  - Web Audio API polyphonic synthesizer
  - Canvas-based real-time visualization
  
- [x] **Screen Layout**
  - Strict 30/70 split (Left: Control, Right: Piano)
  - Visual zone indicators
  - Coordinate mirroring (text renders correctly)

- [x] **Left Hand Controls**
  - Volume control via pinch-to-slide gesture
  - Mode toggle via fist gesture (Melody ↔ Chords)
  - Visual volume bar feedback

- [x] **Right Hand Controls**
  - Melody Mode: Pinch to play single notes
  - Chords Mode: Multi-finger polyphony
  - 24-note chromatic scale (B3-B5)

- [x] **Audio Engine**
  - Polyphonic synthesis (ADSR envelopes)
  - Triangle wave oscillators
  - Dynamic volume control
  - Note on/off transitions

### 🚧 Known Issues

#### High Priority

1. **Volume Control - Relative Motion** (Issue #1)
   - **Problem**: When re-pinching, volume jumps to absolute hand position
   - **Expected**: Volume should adjust relative to locked value
   - **Location**: `src/main.js` lines 77-85
   - **Fix Required**: Track initial pinch position and calculate delta

2. **Hand Zone Enforcement**
   - **Problem**: No visual feedback when hands are in wrong zones
   - **Expected**: Warning when left hand enters right zone or vice versa
   - **Suggestion**: Add colored overlay or border flash

#### Medium Priority

3. **Fist Toggle Accuracy**
   - **Issue**: Sometimes toggles unintentionally
   - **Current**: 3+ fingers curled with 60-frame cooldown
   - **Suggestion**: Require sustained fist (3-5 frames) before toggle

4. **Note Triggering in Chords Mode**
   - **Issue**: Notes can be "sticky" or re-trigger rapidly
   - **Suggestion**: Add hysteresis or minimum note duration

#### Low Priority

5. **Mobile Support**
   - Currently desktop-only (requires landscape orientation for mobile)

6. **Performance Optimization**
   - Particle system can lag on slower machines

## Architecture Details

### Data Flow

```
Camera Feed → MediaPipe Hands → Landmarks (normalized 0-1)
                                      ↓
                            Mirror Coordinates (1-x)
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
            Left Zone (x < 0.3)              Right Zone (x > 0.3)
                    ↓                                   ↓
        Volume Control + Mode Toggle         Note Triggering
                    ↓                                   ↓
                    └─────────────────┬─────────────────┘
                                      ↓
                              Audio Engine & Visuals
```

### Key Files

#### `src/main.js` (Main Application Logic)
- **Lines 27-31**: State variables (volume, mode, cooldowns)
- **Lines 54-68**: Coordinate mirroring logic
- **Lines 73-115**: Left hand gesture processing
- **Lines 116-155**: Right hand note triggering
- **Lines 157-176**: Audio sync and visual updates

**Important Variables:**
- `volume` (line 31): Persistent volume state
- `isChordsMode` (line 28): Melody vs Chords toggle
- `activeNotes` (line 27): Set of currently playing note indices

#### `src/audio.js` (Audio Engine)
- **Lines 40-64**: `playNote()` - ADSR envelope creation
- **Lines 66-80**: `stopNote()` - Graceful note release
- **Lines 5**: `activeOscillators` - Map of frequency → oscillator nodes

#### `src/visuals.js` (Canvas Rendering)
- **Lines 43-88**: Main draw loop
- **Lines 60-76**: Volume bar rendering
- **Lines 78-92**: Mode indicator
- **Lines 127-136**: Hand skeleton with mirrored coordinates

#### `src/vision.js` (MediaPipe Integration)
- **Lines 15-20**: MediaPipe Hands configuration
- **maxNumHands**: 2
- **minDetectionConfidence**: 0.5

## Quick Fix Guide

### Fix #1: Relative Volume Control

**Problem Location**: `src/main.js` line 77-85

**Current Code**:
```javascript
if (pinchDist < 0.05) {
    volume = Math.max(0, Math.min(1, 1 - wrist.y));
}
```

**Suggested Fix**:
```javascript
// Add to state variables (line 31):
let volumeGrabY = null;
let volumeGrabValue = 0.5;

// Replace volume control logic:
if (pinchDist < 0.05) {
    if (volumeGrabY === null) {
        // First frame of pinch - record starting position
        volumeGrabY = wrist.y;
        volumeGrabValue = volume;
    } else {
        // Adjust volume based on delta from grab point
        const deltaY = volumeGrabY - wrist.y;
        volume = Math.max(0, Math.min(1, volumeGrabValue + deltaY));
    }
} else {
    // Released - reset grab tracking
    volumeGrabY = null;
    volumeGrabValue = volume;
}
```

### Testing Checklist

When making changes, verify:
- [ ] Volume locks when pinch is released
- [ ] Fist toggle works reliably (no accidental triggers)
- [ ] Notes trigger cleanly in both modes
- [ ] No console errors
- [ ] Visual feedback is clear
- [ ] Audio doesn't glitch or cut out

## Development Workflow

1. **Make Changes**: Edit files in `src/`
2. **No Build Step**: Direct file reload (Ctrl+R / Cmd+R)
3. **Test Gestures**: Use both hands to verify changes
4. **Console Logging**: Check browser DevTools for errors
5. **Commit Often**: Small, focused commits

## Adding New Features

### Example: Adding a New Musical Scale

1. **Update `src/main.js`** (line 17-24):
   ```javascript
   // Current: B3-B5 chromatic
   // Add: Major scale option
   const scales = {
       chromatic: generateChromaticScale(246.94, 24),
       major: generateMajorScale(261.63) // C Major
   };
   ```

2. **Add UI Toggle**: Create button in `index.html`
3. **Update Visuals**: Modify key rendering in `src/visuals.js`

## Debugging Tips

- **Hand not detected?** Check browser console for MediaPipe errors
- **Audio not working?** Ensure AudioContext resumed (click Start Audio)
- **Gestures not triggering?** Add console.log to track landmark values
- **Performance issues?** Reduce particle count in `src/visuals.js`

## Useful Resources

- [MediaPipe Hands Docs](https://google.github.io/mediapipe/solutions/hands.html)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## Next Steps (Roadmap)

- [ ] Fix relative volume control
- [ ] Add visual hand zone warnings
- [ ] Implement customizable scales (Major, Minor, Pentatonic)
- [ ] Add waveform selection (Sine, Square, Sawtooth)
- [ ] Recording/playback functionality
- [ ] MIDI output support
- [ ] Mobile optimization

---

**Questions or Issues?** Check the conversation logs in `.gemini/antigravity/brain/` for full context.
