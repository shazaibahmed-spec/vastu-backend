# Image Detection & Vision Analysis Layer

> **Authoritative Technical Specification** for the Vastu AI visual perception pipeline.
> Compliant with the core principles in [`AGENTS.md`](../AGENTS.md).

---

## 1. Architectural Philosophy: The Golden Rule

The computer vision layer strictly separates **visual observation** from **Vastu evaluation**:

```
[User Image]
     │
     ▼
[Image Validation & Sanitization] (MIME sniffing, EXIF strip, WebP convert)
     │
     ▼
[Pre-AI Quality Assessment] (Sharp pixel statistics: blur, exposure, dimensions)
     │
     ▼
[Vision Detection Model] (Gemini 3.5 Flash / GPT-4o — strictly factual observer)
     │
     ▼
[Normalization & Schema Validation] (Bounding boxes, confidence, coordinates)
     │
     ▼
[Spatial / Compass Mapping] (FOV degree calculation, zone placement)
     │
     ▼
[Vastu Rules Engine] (100% deterministic, zero LLM interpretation)
     │
     ▼
[LLM AI Synthesis] (Empathetic natural-language explanation & practical remedies)
```

> [!IMPORTANT]
> The image detection model is **never asked**: *"Is this good or bad Vastu?"*
> The Vision AI is strictly an architectural surveyor reporting physical facts: *what object is present, where it is located in normalized coordinates, bounding boxes, and image clarity*.

---

## 2. Supported Objects by Room Type

Each room type is evaluated against a curated dictionary of Vastu-relevant architectural fixtures and furniture:

| Room Type | Primary Detectable Objects | Vastu Significance |
|:---|:---|:---|
| **BEDROOM** | `bed`, `mirror`, `wardrobe`, `overhead_beam`, `attached_toilet`, `window`, `television` | Sleeping orientation (South/East), mirror reflection of bed, heavy storage stability zone (SW) |
| **KITCHEN** | `gas_stove`, `kitchen_sink`, `refrigerator`, `microwave_oven`, `water_purifier`, `exhaust_fan` | Fire element (Agni / SE), water element (Ishanya / NE), fire-water conflict avoidance |
| **LIVING_ROOM** | `sofa_set`, `coffee_table`, `television`, `indoor_plants`, `aquarium`, `main_window`, `pooja_altar` | Seating posture facing North/East, heavy furniture in South/West, light North/East |
| **MAIN_ENTRANCE** | `entrance_door`, `shoe_rack`, `nameplate`, `doorstep_threshold`, `staircase`, `foyer_mirror` | Energy threshold, unobstructed pathway, clockwise opening direction |
| **OFFICE** | `work_desk`, `office_chair`, `computer_screen`, `bookshelf`, `filing_cabinet`, `desk_lamp` | Facing North/East while working, solid wall backing, electronic equipment in SE |

---

## 3. Vision Provider Abstraction & Interface

The core vision interface lives behind TypeScript interface ports (`src/modules/ai/interfaces/vision-provider.interface.ts`):

```typescript
export interface VisionAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  roomType: RoomTypeEnum;
  headingDegrees?: number;
  calibratedDirection?: DirectionEnum;
}

export interface DetectedSpatialObject {
  objectType: string;
  label: string;
  zone: DirectionEnum;
  relativePosition: { x: number; y: number }; // 0.0 to 1.0 (left-to-right, top-to-bottom)
  boundingBox?: { x: number; y: number; width: number; height: number }; // normalized 0..1
  confidence: number; // 0.0 to 1.0
  detectionStatus?: 'DETECTED' | 'UNCERTAIN' | 'NOT_DETECTED';
  attributes: Record<string, unknown>;
}

export interface VisionAnalysisResult {
  roomTypeDetected: RoomTypeEnum;
  roomTypeConfidence: number; // 0.0 to 1.0
  roomTypeSource: 'USER_PROVIDED' | 'VISION_MODEL';
  detectedObjects: DetectedSpatialObject[];
  qualityAssessment: {
    isClear: boolean;
    lighting: 'POOR' | 'MODERATE' | 'GOOD';
    isBlurry: boolean;
    isArchitecturalSpace: boolean;
    score: number; // 0.0 to 1.0
    usable: boolean;
    issues: string[];
  };
  observations: string[];
  rawModelName?: string;
  processingMetadata?: {
    modelName: string;
    promptVersion: string;
    processingDurationMs: number;
    imageDimensions?: { width: number; height: number };
    imageSizeBytes?: number;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  };
}
```

---

## 4. Normalization Layer

Because multimodal LLMs output unpredictable JSON quirks (percentages instead of decimals, mixed-case directions, abbreviations like `NE` or `SW`), the system routes all AI outputs through a deterministic normalizer (`src/modules/ai/utils/vision-normalization.util.ts`):

1. **Coordinates & Confidences**: Values between `2` and `100` are normalized to `val / 100`. Values `< 0` or `> 1` are clamped to `[0, 1]`.
2. **Direction Codes**: Abbreviations (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`, `CENTER`) and variations (`North-East`, `north_west`, `Brahmasthan`) map to canonical `DirectionEnum`.
3. **Room Types**: Case-insensitive substring matching maps `'master_bedroom'` -> `BEDROOM`, `'kitchenette'` -> `KITCHEN`, etc.
4. **Bounding Boxes**: Coordinates are clamped to `[0, 1]`. Malformed boxes with missing dimensions are safely dropped.
5. **Detection Status**:
   - `confidence >= 0.6` -> `'DETECTED'`
   - `0.3 <= confidence < 0.6` -> `'UNCERTAIN'`
   - `confidence < 0.3` -> `'NOT_DETECTED'` (filtered out before Vastu rules engine).

---

## 5. Pre-AI Image Quality Assessment

To save API credits and provide instant feedback, `ImageProcessingService.assessImageQuality` evaluates image buffers using Sharp pixel statistics **before** any AI model is invoked:

1. **Byte Size**: Minimum 512 bytes (avoids empty/truncated files); Maximum 10MB.
2. **Resolution**: Minimum dimension must be $\ge 120\text{px}$, maximum $\ge 160\text{px}$.
3. **Exposure & Luminance**:
   - Mean channel luminance $< 30$ -> `TOO_DARK`
   - Mean channel luminance $> 245$ -> `OVEREXPOSED`
4. **Aspect Ratio**: Aspect ratio $> 5:1$ flags `EXTREME_ASPECT_RATIO` (panoramic glitches or banner slices).
5. **Usability Score**: If composite score $< 0.3$, throws `ImageQualityInsufficientException` (HTTP 422) with actionable error codes.

---

## 6. Spatial & Direction Mapping

When the mobile device provides a compass heading, object locations in the photo are projected to room compass zones via `CompassUtil`:

$$\text{Object Heading} = \text{Camera Heading} + \left(x - 0.5\right) \times \text{FOV}_\text{horizontal}$$

Where:
- $x \in [0, 1]$ is the normalized horizontal center of the detected object.
- $\text{FOV}_\text{horizontal} \approx 60^\circ$ is standard smartphone camera horizontal field of view.
- If compass data is missing or marked `UNKNOWN`, direction confidence is penalized and objects default to room `CENTER` with `isEstimated: true`.

---

## 7. Model Comparison & Multi-Provider Architecture

| Metric | Local Model (FastAPI + YOLOv8) | Gemini 3.5 Flash (Cloud) | GPT-4o (Cloud Adapter) |
|:---|:---|:---|:---|
| **Hosting** | Self-Hosted (Internal CPU/GPU) | Google Cloud | OpenAI Cloud |
| **Inference Latency** | **15 – 35 ms (GPU/MPS), ~45 ms (CPU)** | 1.0 – 2.5 seconds | 2.5 – 5.0 seconds |
| **Data Privacy** | 100% on-premises; zero cloud transit | Data processed via Google API | Data processed via OpenAI API |
| **Cost per 1,000 Images** | **$0 (Fixed infrastructure)** | ~$1.50 – $3.00 | ~$15.00 – $30.00 |
| **Specialized Classes** | Fine-tunable custom weights (`.pt`) | Broad general zero-shot | Broad general zero-shot |
| **Fallback Mechanism** | Fallback to Cloud/Mock via Router | Primary -> Flash-Lite | Retries with backoff |

### Provider Configuration & Fallback:
- `VISION_PROVIDER`: `'existing' | 'local' | 'gemini' | 'openai' | 'mock'` (default: `existing`)
- `EXISTING_VISION_PROVIDER`: `'mock' | 'gemini' | 'openai'` (default: `mock`)
- `VISION_FALLBACK_ENABLED`: `true | false` (default: `false`)
- `VISION_FALLBACK_PROVIDER`: `'existing' | 'gemini' | 'openai' | 'mock'` (default: `existing`)
- Full documentation on running and fine-tuning the local model: [`docs/local-vision-model.md`](./local-vision-model.md).

---

## 8. Visual Detection Overlay & Coordinate Mapping

### 8.1. Architectural Flow
```text
Image Upload
     │
     ▼
Vision Analysis (Local YOLOv8 or Cloud Gemini/OpenAI)
     │
     ▼
Detected Objects + Normalized Bounding Boxes [0..1]
     │
     ▼
Vastu Rules Engine (Evaluates Vastu Compliance Deterministically)
     │
     ▼
Report Screen Visual Overlay (AnalyzedImageView + DetectionOverlay)
     │
     ▼
Empathy Remedies & Consultant Readings
```

### 8.2. Normalized Bounding Box Contract
Every detected item includes standard normalized coordinates independent of the vision provider:
```json
{
  "id": "obj-uuid-1",
  "type": "bed",
  "objectType": "bed",
  "label": "Bed",
  "zone": "SOUTH",
  "confidence": 0.94,
  "boundingBox": {
    "x": 0.12,
    "y": 0.35,
    "width": 0.50,
    "height": 0.30
  }
}
```

### 8.3. Coordinate Projection Across Aspect Ratios
Because mobile camera sensors capture different aspect ratios (4:3, 16:9, square) than the mobile display container, the frontend applies deterministic coordinate projection (`calculateBoundingBoxPixelStyle`):

1. **`contain` Mode (Letterbox / Pillarbox)**:
   - When image is wider than container ($AR_{\text{img}} > AR_{\text{cont}}$):
     $$w_{\text{disp}} = W_{\text{cont}}, \quad h_{\text{disp}} = \frac{W_{\text{cont}}}{AR_{\text{img}}}, \quad offsetX = 0, \quad offsetY = \frac{H_{\text{cont}} - h_{\text{disp}}}{2}$$
   - When image is taller than container ($AR_{\text{img}} \le AR_{\text{cont}}$):
     $$h_{\text{disp}} = H_{\text{cont}}, \quad w_{\text{disp}} = H_{\text{cont}} \times AR_{\text{img}}, \quad offsetX = \frac{W_{\text{cont}} - w_{\text{disp}}}{2}, \quad offsetY = 0$$
   - Pixel coordinates:
     $$\text{left} = offsetX + x \times w_{\text{disp}}, \quad \text{top} = offsetY + y \times h_{\text{disp}}$$
     $$\text{width} = \text{width}_{\text{norm}} \times w_{\text{disp}}, \quad \text{height} = \text{height}_{\text{norm}} \times h_{\text{disp}}$$

2. **Boundary Clamping**:
   - Out-of-bounds predictions are clamped to the visible viewport:
     $$\text{left} \in [0, W_{\text{cont}}], \quad \text{top} \in [0, H_{\text{cont}}]$$
     $$\text{width} \le W_{\text{cont}} - \text{left}, \quad \text{height} \le H_{\text{cont}} - \text{top}$$

### 8.4. Reusable Mobile Components
- **`DetectionOverlay`** (`app/src/components/detection/DetectionOverlay.tsx`):
  Renders responsive bounding box outlines with sacred gold accents, touch-to-focus z-indexing, and badges displaying localized labels and confidence percentages.
- **`AnalyzedImageView`** (`app/src/components/detection/AnalyzedImageView.tsx`):
  Container component wrapping the room photograph with dynamic `onLayout` measurement, "Show/Hide Boxes" toggle button, empty state banner when zero objects are detected, and an interactive horizontal pill selector allowing users to inspect individual detected objects.

