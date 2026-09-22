# Product & Technical Requirements (V1)

## 1. Product Overview

The **Vastu AI** platform delivers automated, instant, and authoritative Vastu Shastra architectural evaluations for residential and commercial spaces using smartphone imagery and compass orientation.

### Core Value Proposition
1. **Accessibility**: Eliminates the barrier of scheduling expensive on-site consultations for basic spatial decisions.
2. **Determinism**: Unlike generic chatbot solutions that fabricate conflicting Vastu advice, Vastu AI couples machine vision with a mathematically defined, versioned, classical Vastu Rules Engine.
3. **Actionability**: Rather than causing fear or anxiety regarding architectural flaws, the system provides non-destructive, elemental, and decorative remedies.

---

## 2. Scope for Version 1 (V1)

### 2.1. Supported Room Types
V1 exclusively supports five core functional residential/office zones:
1. **Bedroom**: Bed positioning, headboard direction, mirror placement, electronic placement, wardrobe location.
2. **Living Room**: Seating arrangements, TV/electronics zone, heavy storage units, lighting balance, entrance relationship.
3. **Kitchen**: Cooking stove zone, water sink/drainage location, refrigerator placement, fire-water clash detection.
4. **Main Entrance**: Threshold direction, door swing orientation, mirror reflection into door, obstructions, shoe rack placement.
5. **Office / Study**: Desk orientation, user facing direction, chair backdrop stability, bookshelf placement.

### 2.2. Out-of-Scope for V1 (Future Roadmap)
- Full floor plan (multi-room) CAD/blueprint parsing.
- Real-time Augmented Reality (AR) camera overlays.
- Subscription billing, payment gateways, and in-app purchases.
- Social sharing, public community feeds, and user-to-user messaging.
- Live video consultations with human astrologers/architects.

---

## 3. Input Specifications

### 3.1. Required Inputs
| Field Name | Type | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- |
| `image` | `File (binary)` | Max 10MB; JPEG/PNG/WebP/HEIC | Photographic capture of the room space |
| `roomType` | `Enum` | `BEDROOM`, `LIVING_ROOM`, `KITCHEN`, `MAIN_ENTRANCE`, `OFFICE` | The designated functional type of the room |
| `directionSource`| `Enum` | `DEVICE_COMPASS`, `USER_SELECTED`, `UNKNOWN` | Origin of the orientation calibration |

### 3.2. Orientation & Direction Inputs
Accurate Vastu analysis fundamentally depends on geographical orientation. A photo alone cannot reliably indicate North.
- **When `directionSource == DEVICE_COMPASS`**:
  - `compassHeading` (Float, Required): Compass degrees from True/Magnetic North (`0.0°` to `359.9°`).
  - Represents the camera's line of sight (forward vector).
- **When `directionSource == USER_SELECTED`**:
  - `userSelectedDirection` (Enum, Required): Cardinal/ordinal direction the camera is facing:
    `NORTH`, `NORTH_EAST`, `EAST`, `SOUTH_EAST`, `SOUTH`, `SOUTH_WEST`, `WEST`, `NORTH_WEST`.
- **When `directionSource == UNKNOWN`**:
  - Analysis proceeds in **Degraded Mode** (see Edge Cases below).

### 3.3. Optional Inputs
- `language` (Enum): `en`, `hi`, `ta`, `te`, `kn`, `ml`, `bn`, `gu`, `mr`, `pa` (Target language for AI-generated explanations and remedies. Defaults to user's saved preference or `en`).
- `notes` (String, max 500 chars): User comments (e.g., "Master bedroom on 2nd floor").
- `occupantRole` (Enum): `PRIMARY_BREADWINNER`, `CHILD`, `GUEST`, `ELDERLY` (used for bedroom placement tailoring).

---

## 4. Image Requirements & Ingestion Rules

1. **Supported Formats**:
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `image/heic` / `image/heif` (Transcoded server-side to JPEG via Sharp).
2. **File Size**:
   - Minimum: `10 KB` (reject empty or truncated uploads).
   - Maximum: `10 MB` (enforced at reverse proxy and NestJS Multer boundary).
3. **Resolution**:
   - Minimum acceptable resolution: `640 x 480` pixels.
   - Max dimension: `4096 x 4096` pixels. Images exceeding `2048px` along the longest edge are automatically downscaled before forwarding to Vision AI to optimize cost and latency.
4. **MIME Verification**:
   - The file extension and client-provided `Content-Type` are untrusted.
   - The backend inspects magic bytes via buffer sniffing. Non-conforming payloads are rejected with `HTTP 415 Unsupported Media Type`.
5. **EXIF Handling**:
   - EXIF orientation tags are automatically respected during normalization and subsequently stripped to safeguard user privacy (removing GPS coordinates and device serials).

---

## 5. Output Specifications (Analysis Report)

Every completed analysis produces a structured report returned to the client:

```json
{
  "analysisId": "e2f1837a-42c2-48a0-9759-cf22880bce42",
  "roomType": "BEDROOM",
  "status": "COMPLETED",
  "language": "hi",
  "orientation": {
    "direction": "SOUTH",
    "heading": 182.5,
    "source": "DEVICE_COMPASS",
    "isCalibrated": true
  },
  "overallScore": 74,
  "scoreBand": "GOOD",
  "elementalBalance": {
    "fire": "BALANCED",
    "water": "NEUTRAL",
    "earth": "EXCELLENT",
    "air": "NEEDS_ATTENTION",
    "space": "BALANCED"
  },
  "detectedObjects": [
    {
      "id": "obj_01",
      "objectType": "bed",
      "label": "Double Bed",
      "zone": "SOUTH_WEST",
      "relativePosition": { "x": 0.52, "y": 0.65 },
      "confidence": 0.94,
      "attributes": {
        "headboardDirection": "SOUTH",
        "material": "wood"
      }
    },
    {
      "id": "obj_02",
      "objectType": "mirror",
      "label": "Dressing Mirror",
      "zone": "NORTH",
      "relativePosition": { "x": 0.88, "y": 0.40 },
      "confidence": 0.88,
      "attributes": {
        "reflectsBed": true
      }
    }
  ],
  "findings": [
    {
      "ruleCode": "BED-002-HEAD-SOUTH",
      "category": "PLACEMENT",
      "verdict": "COMPLIANT",
      "severity": "LOW",
      "title": "Favorable Head Placement",
      "description": "Headboard is situated towards the South, promoting sound restorative sleep and mental stability."
    },
    {
      "ruleCode": "BED-005-MIRROR-REFLECTION",
      "category": "DEFECT",
      "verdict": "DEFECT",
      "severity": "HIGH",
      "title": "Mirror Reflecting Sleeping Position",
      "description": "The dressing mirror directly reflects the bed, which according to Vastu creates energetic restlessness and physical stress.",
      "remedies": [
        {
          "type": "DECORATIVE",
          "action": "Cover mirror with an opaque fabric during sleeping hours or relocate to the East wall."
        }
      ]
    }
  ],
  "aiSummary": "Your bedroom exhibits strong foundational alignment with the bed anchored in the South-West zone. The primary area requiring attention is the mirror reflection across the sleeping plane.",
  "createdAt": "2026-09-10T11:45:00.000Z"
}
```

---

## 6. Strict Separation of Concerns: The Three Pillars

To maintain architectural integrity and auditability, data is strictly categorized into three separate layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. AI-DETECTED FACTS (Objective Vision Data)                                │
│    - What objects exist in the frame? (bed, stove, mirror, window)          │
│    - Where are they in normalized space? (x, y coordinates)                 │
│    - What are their physical attributes? (headboard orientation, material)   │
│    - What is the detection confidence? (e.g., 0.92)                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Fed into
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. VASTU RULE CONCLUSIONS (Deterministic Business Logic)                    │
│    - Rule ID matches (e.g., BED-001, KIT-004)                               │
│    - Mathematical compliance checks (Zone == SOUTH_WEST)                    │
│    - Severity calculation (CRITICAL, HIGH, MEDIUM, LOW)                     │
│    - Numerical score deductions (-15 points for mirror defect)              │
│    - Standard canonical remedies from database repository                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Fed into
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. AI-GENERATED EXPLANATIONS (Empathetic Translation)                       │
│    - Natural language summary for non-experts                               │
│    - Tailored actionable remedy suggestions without changing canonical rule │
│    - Encouraging, non-superstitious tone                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Edge Cases & Failure Handling

### 7.1. Missing or Uncertain Direction (`directionSource: UNKNOWN`)
- **Behavior**: The Rules Engine skips zone-specific directional rules (e.g., "Bed in North-East") and evaluates **spatial relationship heuristics** (e.g., "Bed under overhead concrete beam", "Bed aligned directly opposite room door", "Mirror reflecting bed").
- **Client Flag**: The report returns `isCalibrated: false` and adds an advisory: `"Directional evaluation skipped. Re-scan with device compass enabled for complete zone analysis."`

### 7.2. Vision AI Cannot Detect Room Objects (Low Confidence / Clutter)
- If the Vision AI detects 0 primary objects matching the room type with confidence $\ge 0.60$:
  - The analysis does not crash.
  - The state transitions to `COMPLETED` with an advisory finding: `NO_KEY_OBJECTS_DETECTED`.
  - The score is marked `INCONCLUSIVE` (null or 0).
  - The response advises the user: `"Could not clearly detect major bedroom furniture. Please capture a wider angle showing the bed and walls."`

### 7.3. Poor Image Quality (Blurry, Dark, Obstructed)
- The Vision AI includes a `QualityAssessment` step.
- If `isClear: false` or `lighting: 'POOR'`:
  - Request immediately fails with domain error `POOR_IMAGE_QUALITY` (HTTP 422).
  - Error envelope includes recommendations: `"Lighting too dim or camera motion blur detected. Please turn on lights and hold phone steady."`
  - The user's analysis quota/retry is preserved.

---

## 8. Multilingual Architecture & Localization Requirements

### 8.1. Supported Languages
The platform must support 10 languages:
1. English (`en`)
2. Hindi (`hi` — हिन्दी)
3. Tamil (`ta` — தமிழ்)
4. Telugu (`te` — తెలుగు)
5. Kannada (`kn` — ಕನ್ನಡ)
6. Malayalam (`ml` — മലയാളം)
7. Bengali (`bn` — বাংলা)
8. Gujarati (`gu` — ગુજરાતી)
9. Marathi (`mr` — मराठी)
10. Punjabi (`pa` — ਪੰਜਾਬੀ)

### 8.2. Separation of UI Localization and AI Explanation
- **Static App UI**: Navigation, titles, validation errors, buttons, and badges are managed through client-side localization dictionaries. Static UI labels are never sent to external AI providers.
- **Dynamic Vastu Analysis**: Summaries, findings, layperson explanations, and remedial guidance are synthesized in the requested language via the LLM provider.
- **Language-Independent Rules**: Vastu rule logic, rule codes (e.g. `BED-001`), severity enums, and score math are completely decoupled from language.
- **Resolution & Fallback**: Client explicit choice $\rightarrow$ User account preference $\rightarrow$ App device locale $\rightarrow$ English (`en`) fallback.
- **Extensibility**: System architecture must support adding an 11th language without database schema changes or core refactoring.
