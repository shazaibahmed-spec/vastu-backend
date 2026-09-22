# End-to-End Analysis Pipeline

## 1. Overview & Architectural Flow

The Vastu AI Analysis Pipeline orchestrates the transition from raw user photo upload to an empathetic, mathematically accurate, and multilingual Vastu report.

```text
User Image Upload (Multipart / Camera Capture)
      │
      ▼
1. Pre-AI Quality & Image Sanitization (Sharp / StorageService)
      │
      ▼
2. Vision Detection via VisionRouterService (VISION_PROVIDER_TOKEN)
      │   ├── Primary: LocalVisionAdapter (FastAPI YOLOv8) OR Cloud (Gemini/OpenAI)
      │   └── Fallback: Automatic fallback on technical failure (if enabled)
      │
      ▼
3. Normalization & Zod Schema Validation (vision-normalization.util.ts)
      │
      ▼
4. Spatial Direction & Compass Mapping (CompassUtil)
      │
      ▼
5. Deterministic Vastu Rules Engine (Pure Domain, 100% testable)
      │
      ▼
6. LLM Explanation & Remedy Synthesis (Localized, Empathetic, Structured)
      │
      ▼
7. Final Report & History Persistence (PostgreSQL / Prisma)
```

---

## 2. State Machine Lifecycle

Every analysis moves through strict state transitions defined in `AnalysisStatusEnum`:

```text
PENDING
   │
   ▼
IMAGE_UPLOADED
   │
   ▼
AI_ANALYSIS ──(Failure)──► FAILED_AI_ANALYSIS (Retryable)
   │
   ▼
OBJECT_DETECTION
   │
   ▼
RULE_EVALUATION ──(Failure)──► FAILED_RULE_EVALUATION
   │
   ▼
REPORT_GENERATION ──(Failure)──► FAILED_REPORT_GENERATION (Retryable)
   │
   ▼
COMPLETED
```

---

## 3. Vision Provider Routing in Pipeline

`AnalysisPipelineService` depends exclusively on the `VisionProvider` interface via the `VISION_PROVIDER_TOKEN` injection token:

```typescript
@Inject(VISION_PROVIDER_TOKEN)
private readonly visionProvider: VisionProvider
```

`VisionRouterService` implements `VisionProvider` and delegates to:
1. **Local Model Provider** (`LocalVisionAdapter`): Calls the local YOLOv8 FastAPI service running in `services/vision-model/` or container `vastu_vision_model`.
2. **Existing Cloud Providers** (`GeminiVisionAdapter`, `OpenAiVisionAdapter`).
3. **Mock Provider** (`MockVisionAdapter`).

### Technical Failure Fallback:
If `VISION_FALLBACK_ENABLED=true` and the primary provider experiences a network timeout, socket closure, or 5xx crash:
- The router logs a warning and increments `vision_fallback_count`.
- Automatically executes the secondary provider (`VISION_FALLBACK_PROVIDER`).
- Returns the normalized result without failing the user analysis request.

---

## 4. Separation of Concerns

1. **Vision Model**: Solely responsible for identifying objects, labels, confidence scores, and normalized bounding boxes $[0, 1]$.
2. **Compass & Direction**: Combines normalized object coordinates with device compass heading (0–360°) to assign cardinal/ordinal zones (`NORTH`, `SOUTH_EAST`, etc.).
3. **Rules Engine**: Operates purely on domain objects and directional facts. Completely unaware of AI providers or LLMs.
4. **LLM Explainer**: Synthesizes human-friendly, empathetic explanations and remedies in the user's requested language without inventing rules.
