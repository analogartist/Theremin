# Gesture Reference Guide

Quick reference for all supported hand gestures in the Air Piano application.

## Left Hand Gestures (Control Zone - 30%)

### Volume Control: Pinch-to-Slide

**How to Perform:**
1. Bring your **thumb tip** and **index finger tip** together (< 2cm apart)
2. While pinching, move your hand **up** or **down**
3. Release the pinch to lock the volume

**Visual Feedback:**
- Volume bar on left side shows current level
- Bar fills from bottom to top (0-100%)

**Tips:**
- Pinch closer for more precise control
- The volume persists when you release
- Re-pinch to adjust again

---

### Mode Toggle: Fist

**How to Perform:**
1. Curl **at least 3 fingers** (index, middle, ring, pinky)
2. Hold for a brief moment
3. Open hand to reset

**Visual Feedback:**
- **MODE: MELODY** (Blue text) - Single-note precision
- **MODE: CHORDS** (Red text) - Multi-finger polyphony
- Mode indicator appears in top-left

**Tips:**
- Must hold fist for ~0.5 seconds (debounced)
- Open hand fully between toggles
- Thumb position doesn't matter

---

## Right Hand Gestures (Piano Zone - 70%)

### Melody Mode: Precision Pinch

**How to Perform:**
1. **Pinch** thumb and index finger together
2. Move hand **left/right** across the piano zone
3. Notes play based on horizontal position

**Mapping:**
- Left edge → B3 (low note)
- Right edge → B5 (high note)  
- 24 chromatic notes across the zone

**Tips:**
- Release pinch to stop note
- Only index finger position matters
- Smooth movement = smooth pitch changes

---

### Chords Mode: Multi-Finger Touch

**How to Perform:**
1. Extend **multiple fingers** into the piano zone
2. Each finger triggers a note at its horizontal position
3. Move fingers left/right to change chord voicing

**Mapping:**
- Each of 5 fingers can trigger independent notes
- Horizontal position determines pitch
- Vertical position doesn't matter

**Tips:**
- Spread fingers for wider intervals
- Bring fingers together for tighter harmonies
- Any combination of fingers works

---

## Common Issues

### "My gestures aren't being detected"

**Check:**
- ✓ Is your hand fully in the correct zone?
- ✓ Is there enough lighting on your hands?
- ✓ Are you too close/far from the camera?

**Optimal Distance:** 40-80cm from webcam

---

### "Volume jumps when I re-pinch"

**Known Issue:** Volume currently resets to absolute hand position.
**Workaround:** Pinch at the same height as your last adjustment.
**Fix in Progress:** See DEVELOPMENT.md Issue #1

---

### "Fist toggle triggers accidentally"

**Causes:**
- Hand leaving the left zone
- Rapid hand movements

**Solutions:**
- Keep hand steady in left zone
- Deliberate fist gesture
- Wait 1 second between toggles

---

### "Notes are sticky/won't stop playing"

**Causes:**
- Pinch threshold too high
- Hand on zone boundary

**Solutions:**
- Fully release pinch
- Move hand clearly out of right zone
- Refresh page if stuck

---

## Technical Details

### Landmark Detection

The app uses MediaPipe Hands 21-point landmark detection:

**Key Landmarks:**
- Landmark 0: Wrist
- Landmark 4: Thumb tip
- Landmark 8: Index tip
- Landmark 12: Middle tip
- Landmark 16: Ring tip
- Landmark 20: Pinky tip

### Thresholds

```javascript
Volume Pinch: distance < 0.05 (normalized coordinates)
Melody Pinch: distance < 0.05 (normalized coordinates)
Fist Detection: 3+ fingers with tip.y > pip.y
Zone Split: x = 0.3 (30% from left edge)
```

### Performance Tips

- **Good Lighting:** Ensures accurate hand detection
- **Solid Background:** Reduces false positives
- **Steady Hands:** Smoother audio output
- **Clean Gestures:** Deliberate movements work best

---

## Customization Ideas

Want to modify the gestures? See `src/main.js`:

- **Line 78:** Pinch threshold (default 0.05)
- **Line 90:** Fist curl count (default 3)
- **Line 107:** Mode toggle cooldown (default 60 frames)

---

**Back to:** [README.md](../README.md) | [DEVELOPMENT.md](../DEVELOPMENT.md)
