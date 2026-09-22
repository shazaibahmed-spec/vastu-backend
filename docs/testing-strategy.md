# Quality Assurance & Testing Strategy

## 1. Testing Philosophy & Test Pyramid

Testing in Vastu AI adheres to the principle of **Deterministic Isolation**:
1. Business logic (the Vastu Rules Engine) must have **zero external dependencies** and achieve **100% path coverage**.
2. Third-party AI providers (Vision and LLM) must be **completely mockable** so that tests run fast, reliably, offline, and at zero cost.
3. Database and storage integrations are tested against isolated test instances.

```
                   ▲
                  / \
                 /E2E\       ~10% (Supertest / Fastify/Express HTTP Flows)
                /-----\
               / Integ \     ~20% (Prisma Test DB, Storage Adapters, Orchestrator)
              /---------\
             /   Unit    \   ~70% (Vastu Rules Engine, Math, DTOs, State Machine)
            /-------------\
```

---

## 2. Unit Testing Strategy

### 2.1. Vastu Rules Engine (Target Coverage: 100%)
- Every seeded Vastu rule in `docs/vastu-rules.md` must have dedicated test assertions for both `MATCH` and `NO_MATCH` scenarios.
- **Test Scenarios**:
  - `BED-001`: Verify bed in `SOUTH_WEST` triggers `COMPLIANT` and score bonus.
  - `BED-002`: Verify bed in `NORTH_EAST` triggers `DEFECT` with `CRITICAL` severity and $-25$ score penalty.
  - `BED-003`: Verify headboard facing `NORTH` triggers `CRITICAL` defect.
  - `KIT-001`: Verify stove in `SOUTH_EAST` evaluates to `COMPLIANT`.
  - `KIT-002`: Verify stove in `NORTH_EAST` triggers `CRITICAL` elemental clash.
  - `KIT-004`: Verify stove within $< 0.9\text{m}$ of water sink triggers Fire-Water clash defect.
  - `ENT-001`: Verify entrance in `NORTH_EAST` evaluates to `COMPLIANT`.
  - `ENT-003`: Verify mirror reflecting entry door triggers `DEFECT`.

### 2.2. Coordinate & Compass Mathematics
- Test degree-to-octant boundary math:
  - `0.0°` $\rightarrow$ `NORTH`
  - `22.4°` $\rightarrow$ `NORTH`
  - `22.5°` $\rightarrow$ `NORTH_EAST`
  - `45.0°` $\rightarrow$ `NORTH_EAST`
  - `180.0°` $\rightarrow$ `SOUTH`
  - `337.4°` $\rightarrow$ `NORTH_WEST`
  - `337.5°` $\rightarrow$ `NORTH`
  - `359.9°` $\rightarrow$ `NORTH`
  - Test wrapping for negative angles or $>360^\circ$ angles.

### 2.3. DTO Validation & Edge Cases
- Test `CreateAnalysisDto` constraints:
  - Missing room type $\rightarrow$ Validation error.
  - Invalid room type enum (e.g. `'GARAGE'`) $\rightarrow$ Validation error.
  - `directionSource: DEVICE_COMPASS` without `compassHeading` $\rightarrow$ Custom pipe error.
  - `compassHeading: -5.0` or `365.0` $\rightarrow$ Range error.
  - Invalid language code (e.g. `'fr'`, `'es'`, SQL injection) $\rightarrow$ Validation error (`SupportedLanguageEnum`).

### 2.4. Multilingual & Localization Testing
A dedicated parameterized test suite (`backend/test/unit/multilingual/multilingual.spec.ts`) verifies all 10 supported languages:
- **Parameterized Coverage**: Every test iterates across `['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'gu', 'mr', 'pa']`.
- **Security & Injection Defense**: Verifies that malicious values (`../../etc`, `<script>`, SQL injection `' OR 1=1--`) are rejected at the DTO boundary before reaching downstream logic.
- **English & Missing Fallback**: Verifies that empty/undefined language gracefully falls back to `SupportedLanguageEnum.ENGLISH`.
- **Schema Validation**: Tests that LLM outputs for each language conform to `ExplanationResultSchema`.
- **Unicode & Script Integrity**: Asserts that Indic UTF-8 multi-byte characters survive serialization, JSON stringification, and object mapping without truncation or encoding drift.

---

## 3. Mock AI Provider Implementation & Test Fixtures

To guarantee hermetic tests, `MockVisionAdapter` and `MockLLMAdapter` implement the exact domain ports without hitting live third-party APIs:

```typescript
// backend/src/modules/ai/adapters/mock-vision.adapter.ts
export class MockVisionAdapter implements VisionProvider {
  // Built-in edge-case fixture generators:
  static poorQualityFixture(): Partial<VisionAnalysisResult>;
  static nonArchitecturalFixture(): Partial<VisionAnalysisResult>;
  static lowConfidenceFixture(): Partial<VisionAnalysisResult>;

  setCustomFixture(fixture?: Partial<VisionAnalysisResult>): void;
  async analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult>;
}
```

### 3.1. Vision Test Fixtures (`backend/test/unit/ai/vision-fixtures.ts`)
Standardized fixtures are maintained for unit and integration tests:
- `BEDROOM_FIXTURE`, `KITCHEN_FIXTURE`: Complete standard rooms with bounding boxes and high confidence.
- `POOR_QUALITY_FIXTURE`: Low score, `usable: false`, issues list (`TOO_DARK`, `EXCESSIVE_BLUR`).
- `NON_ARCHITECTURAL_FIXTURE`: `isArchitecturalSpace: false`, verifies graceful rejection.
- `LOW_CONFIDENCE_DETECTIONS_FIXTURE`: Detections below `CONFIDENCE_LOW` (0.3), verifying rules engine filtering.
- `EMPTY_ROOM_FIXTURE`: Zero objects detected in a room.

---

## 4. Integration & E2E Testing

### 4.1. Analysis Lifecycle State Machine
- Verify that `AnalysisService` correctly transitions:
  `PENDING` $\rightarrow$ `IMAGE_UPLOADED` $\rightarrow$ `AI_ANALYSIS` $\rightarrow$ `OBJECT_DETECTION` $\rightarrow$ `RULE_EVALUATION` $\rightarrow$ `REPORT_GENERATION` $\rightarrow$ `COMPLETED`.
- Simulate Vision timeout: Verify analysis transitions to `FAILED_AI_ANALYSIS` and can be retried via `POST /api/v1/analysis/:id/retry`.

### 4.2. API End-to-End Suite
| Test Case | Method & Endpoint | Payload / Condition | Expected Result |
| :--- | :--- | :--- | :--- |
| **Happy Path Bedroom** | `POST /api/v1/analysis` | Valid image + `BEDROOM` + `180°` | `201 Created` with full report & score |
| **Unauthorized Request** | `POST /api/v1/analysis` | Missing JWT header | `401 Unauthorized` |
| **Invalid Image Mime** | `POST /api/v1/analysis` | Text file disguised as image | `415 Unsupported Media Type` |
| **Oversized Image** | `POST /api/v1/analysis` | Buffer $> 10\text{MB}$ | `400 / 413 Payload Too Large` |
| **Fetch History** | `GET /api/v1/analysis` | Authenticated user | `200 OK` with pagination envelope |
| **IDOR Protection** | `GET /api/v1/analysis/:id`| User B querying User A's report | `403 Forbidden` |

---

## 5. Test Execution Commands

```bash
# Run all unit tests
npm run test

# Run tests with coverage threshold verification
npm run test:cov

# Run Vastu Rules Engine unit tests only
npm run test -- test/unit/vastu

# Run Multilingual & Localization parameterized tests
npm run test -- test/unit/multilingual

# Run integration tests against test database
npm run test:integration

# Run full end-to-end API tests
npm run test:e2e
```
