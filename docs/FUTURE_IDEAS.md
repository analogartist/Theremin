# Future Enhancement Ideas

This document captures brainstorming ideas and potential features for future development.

---

## 1. Depth-Based Control (Z-Axis Detection)

**Status:** Brainstorming  
**Feasibility:** High (MediaPipe already provides Z-coordinates)

### Available Data
MediaPipe Hands provides 3D coordinates for each landmark:
- `x`: Horizontal position (0-1)
- `y`: Vertical position (0-1)
- `z`: **Depth/distance from camera** (negative = closer, positive = farther)

### Potential Use Cases

#### A. Velocity/Attack Control
- **Concept:** Faster forward hand movement = louder/harder note attack
- **Implementation:** Track Z-velocity, map to note velocity
- **Benefit:** Expressive dynamics like striking a real piano key
- **Code Example:**
  ```javascript
  const tip = landmarks[8];
  const velocity = Math.max(0, Math.min(1, -tip.z * 2));
  audio.playNote(frequency, velocity);
  ```

#### B. Dynamic Volume Per Note
- **Concept:** Hand closer to camera = louder, farther = softer
- **Implementation:** Map Z-position to volume multiplier
- **Benefit:** Real-time expression control

#### C. Depth-Based Triggering
- **Concept:** Only trigger notes when hand crosses depth threshold
- **Implementation:** "Push forward to play" gesture
- **Benefit:** Prevents accidental note triggers

#### D. Vibrato/Effects
- **Concept:** Small Z-axis oscillations = vibrato effect
- **Implementation:** Track Z-position variance over time
- **Benefit:** Add musical expression

#### E. Multi-Layer Control
- **Concept:** Different depth zones = different octaves
- **Implementation:** Near = high octave, far = low octave
- **Benefit:** Expand playable range without horizontal movement

### Technical Considerations
- Z-coordinate accuracy varies with lighting
- May need calibration for different camera setups
- Could combine with existing X/Y controls

---

## 2. Dual-Camera Setup

**Status:** Brainstorming  
**Feasibility:** Medium (requires hardware setup + code changes)

### Concept
Use two cameras simultaneously:
- **Camera 1 (e.g., laptop webcam):** Tracks left hand (control zone)
- **Camera 2 (e.g., iPhone):** Tracks right hand (piano zone)

### Benefits
- **Better angles** for each hand independently
- **No occlusion** (hands don't block each other)
- **Higher quality tracking** (can use better camera for piano hand)
- **Independent positioning** (optimize each camera angle)

### Technical Architecture
```
Laptop Webcam → MediaPipe Instance 1 → Left Hand Data
iPhone Camera → MediaPipe Instance 2 → Right Hand Data
                        ↓
                  Merge Results
                        ↓
              Audio Engine + Visuals
```

### Implementation Requirements

#### HTML Changes
```html
<video class="input_video_left" style="display: none;"></video>
<video class="input_video_right" style="display: none;"></video>
```

#### JavaScript Changes
```javascript
const trackerLeft = new HandTracker(videoLeft, onResultsLeft);
const trackerRight = new HandTracker(videoRight, onResultsRight);

let leftHandData = null;
let rightHandData = null;

function onResultsLeft(results) {
    leftHandData = results.multiHandLandmarks[0];
}

function onResultsRight(results) {
    rightHandData = results.multiHandLandmarks[0];
}

// Combine in main loop
const combinedResults = {
    leftHand: leftHandData,
    rightHand: rightHandData
};
```

#### Zone Assignment
- Left camera → always controls left zone (no X-position detection needed)
- Right camera → always controls right zone
- Simplifies zone logic

### Challenges
- **Synchronization:** Slight timing differences between cameras
- **Processing load:** Double the MediaPipe instances
- **Hardware setup:** Camera mounting/positioning
- **Camera access:** Browser may limit simultaneous camera access
- **Complexity:** More code to maintain

### Alternatives
- Use single high-quality camera with wide angle
- Use iPhone as primary camera (better quality than most laptop webcams)

---

## Ideas Template

When adding new ideas, use this format:

### [Idea Name]

**Status:** Brainstorming / Researching / Ready to Implement  
**Feasibility:** Low / Medium / High  
**Priority:** Low / Medium / High

#### Concept
Brief description of the idea

#### Benefits
- Benefit 1
- Benefit 2

#### Implementation Notes
Technical considerations, code snippets, etc.

#### Challenges
Potential obstacles or concerns

---

**Last Updated:** 2026-02-07
