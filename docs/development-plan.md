# Phased Engineering Implementation Roadmap

## Overview & Execution Strategy

To maintain high code quality, testability, and architectural integrity, the Vastu AI backend is built in **incremental, decoupled phases**. Each phase produces working, unit-tested, and production-ready modules without cutting corners or creating throwaway code.

```
PHASE 0  ► Architecture, Specifications & Documentation (Current)
PHASE 1  ► NestJS Foundation, Config, Docker & Prisma
PHASE 2  ► Analysis Domain, DTOs & State Machine
PHASE 3  ► Deterministic Vastu Rules Engine (Pure Domain + Unit Tests)
PHASE 4  ► Image Processing, Sharp Sanitization & Storage Port
PHASE 5  ► AI Vision Provider & Zod Schema Validation
PHASE 6  ► AI LLM Explanation Provider & Report Generation
PHASE 7  ► End-to-End Analysis Pipeline Orchestration
PHASE 8  ► Authentication, JWT Rotation & User History APIs
PHASE 9  ► Security Hardening, Rate Limiting & Correlation Logging
PHASE 10 ► Containerization, Healthchecks & Production Readiness
```

---

## Phase Breakdown

### Phase 0: Requirements & Architecture (Status: COMPLETED)
- [x] Inspect workspace and directory state.
- [x] Author `AGENTS.md` operating manual.
- [x] Author comprehensive project specifications in `docs/`:
  - `architecture.md`
  - `requirements.md`
  - `api-contract.md`
  - `database-design.md`
  - `vastu-rules.md`
  - `ai-architecture.md`
  - `security.md`
  - `testing-strategy.md`
  - `development-plan.md`
- [x] Author root `README.md`.

---

### Phase 1: NestJS Foundation & Infrastructure
- **Objective**: Establish the core NestJS runtime environment with strict typing, configuration validation, Dockerized PostgreSQL, and Prisma ORM.
- **Tasks**:
  1. Scaffold NestJS application in `backend/` with TypeScript strict mode enabled.
  2. Setup `@nestjs/config` with Joi/Zod environment variable validation (`.env.example`).
  3. Create `docker-compose.yml` for local PostgreSQL 16.
  4. Initialize Prisma ORM, configure `schema.prisma`, and generate client.
  5. Configure global `ValidationPipe`, `HttpExceptionFilter`, `LoggingInterceptor`, and `TransformResponseInterceptor`.
  6. Configure Swagger / OpenAPI at `/api/docs`.
- **Validation Criteria**: App starts clean on `npm run start:dev`, connects to Postgres, exposes Swagger documentation, and passes health check.

---

### Phase 2: Analysis Domain & State Machine
- **Objective**: Implement the analysis aggregate root, status lifecycle, and state machine transitions.
- **Tasks**:
  1. Implement `AnalysisStatus` enum and transition state machine in `modules/analysis`.
  2. Implement request and response DTOs (`CreateAnalysisDto`, `AnalysisResponseDto`).
  3. Implement compass direction parser and mathematical angle-to-zone converter.
  4. Create database migration for initial core schema.
- **Validation Criteria**: Unit tests verify valid state transitions and reject illegal transitions (e.g. `PENDING` $\rightarrow$ `COMPLETED` directly).

---

### Phase 3: Deterministic Vastu Rules Engine
- **Objective**: Build the pure domain Vastu Rules Engine with zero external dependencies.
- **Tasks**:
  1. Define AST condition DSL (`modules/vastu/types`).
  2. Implement condition evaluator (`VastuConditionEvaluator`).
  3. Implement scoring algorithm (`VastuScoreCalculator`).
  4. Seed classical rules for all 5 room types: Bedroom, Living Room, Kitchen, Main Entrance, Office.
  5. Implement database seeder to persist rule definitions in `VastuRule` and `VastuRuleVersion`.
- **Validation Criteria**: 100% unit test coverage of all seeded rules and mathematical edge cases with zero external network or AI dependencies.

---

### Phase 4: Image Processing & Storage Layer
- **Objective**: Implement secure file upload, MIME sniffing, Sharp image sanitization, and storage abstraction.
- **Tasks**:
  1. Define `StorageProvider` domain port interface.
  2. Implement `LocalStorageAdapter` for local development.
  3. Implement `S3StorageAdapter` for AWS S3 / Cloudflare R2.
  4. Implement `ImageProcessingService` using `sharp` (magic byte validation, EXIF stripping, WebP/JPEG transcoding, downscaling).
- **Validation Criteria**: Unit & integration tests confirm invalid file types (e.g. text/HTML/SVG disguised as JPG) are rejected with HTTP 415, and valid images have EXIF GPS tags removed.

---

### Phase 5: Vision AI Integration
- **Objective**: Integrate provider-agnostic computer vision for factual spatial object detection.
- **Tasks**:
  1. Define `VisionProvider` domain port interface.
  2. Implement `MockVisionProvider` with pre-defined fixtures for testing.
  3. Implement `OpenAiVisionAdapter` (GPT-4o Vision) or configured alternative.
  4. Implement strict Zod schema validation on AI vision responses.
- **Validation Criteria**: Vision responses are validated against schemas; invalid outputs throw typed domain exceptions without corrupting state.

---

### Phase 6: LLM Explanation & Report Generation
- **Objective**: Integrate provider-agnostic LLM synthesis for converting rule findings into empathetic explanations and practical remedies.
- **Tasks**:
  1. Define `LLMProvider` domain port interface.
  2. Implement `MockLLMProvider` for deterministic testing.
  3. Implement `OpenAiLlmAdapter` / `ClaudeLlmAdapter`.
  4. Author versioned prompt templates enforcing non-hallucination of Vastu rules.
  5. Implement strict Zod schema validation for explanation results.
- **Validation Criteria**: LLM cannot modify canonical rule findings; unit tests verify correct formatting and elemental balance categorization.

---

### Phase 7: End-to-End Analysis Pipeline Orchestration
- **Objective**: Wire all components into a cohesive, transactional pipeline.
- **Tasks**:
  1. Implement `AnalysisPipelineService`:
     `Upload` $\rightarrow$ `Vision` $\rightarrow$ `Rules Engine` $\rightarrow$ `LLM` $\rightarrow$ `Report`.
  2. Handle failure states (`FAILED_AI_ANALYSIS`, `FAILED_REPORT_GENERATION`).
  3. Implement idempotent retry mechanism (`POST /api/v1/analysis/:id/retry`).
  4. Implement image deduplication check via SHA-256 content hashing.
- **Validation Criteria**: Full E2E Supertest passes, generating a complete Vastu analysis report from a test image.

---

### Phase 8: Authentication, Authorization & User History
- **Objective**: Secure the API with JWT tokens and provide user analysis history.
- **Tasks**:
  1. Implement `AuthModule` with registration, login, and refresh token rotation.
  2. Implement `JwtAuthGuard` and `@CurrentUser()` decorator.
  3. Implement paginated history query (`GET /api/v1/analysis`) with filters.
  4. Enforce IDOR protection (users can only access their own analyses).
  5. Implement soft delete (`DELETE /api/v1/analysis/:id`).
- **Validation Criteria**: Unauthorized requests receive HTTP 401; users cannot access other users' data (HTTP 403).

---

### Phase 9: Security Hardening & Observability
- **Objective**: Prepare the system against API abuse, DoS, and operational blindness.
- **Tasks**:
  1. Add Helmet security headers and CORS whitelisting.
  2. Configure `@nestjs/throttler` rate limiting on auth and analysis endpoints.
  3. Implement `CorrelationIdMiddleware` (`x-request-id`).
  4. Configure structured JSON logging with sensitive data masking.
- **Validation Criteria**: Rate limiting triggers HTTP 429 when thresholds are exceeded; logs contain request IDs and mask passwords/tokens.

---

### Phase 10: Production Readiness & Containerization
- **Objective**: Finalize deployment packaging, environment configurations, and health checks.
- **Tasks**:
  1. Create multi-stage production `Dockerfile` (optimized for size and security).
  2. Implement `/health` endpoint using `@nestjs/terminus` (Postgres and disk checks).
  3. Add CI test and lint workflow configuration.
  4. Final documentation review.
- **Validation Criteria**: Docker image builds cleanly and runs in containerized production mode.

---

### Phase 11: Local / Self-Hosted Vision Detection Model (Status: COMPLETED)
- **Objective**: Add a self-hosted, on-premises YOLOv8 object detection provider alongside cloud providers with zero breaking changes, configurable routing, and fallback.
- **Tasks**:
  1. Add configuration schema for `VISION_PROVIDER`, `LOCAL_VISION_*`, and `VISION_FALLBACK_*`.
  2. Create isolated FastAPI inference microservice in `services/vision-model/` with auto-hardware detection (CUDA -> Apple Silicon MPS -> CPU).
  3. Implement `LocalVisionAdapter` adhering to `VisionProvider` interface.
  4. Implement `VisionRouterService` supporting runtime/environment provider resolution and technical failure fallback.
  5. Add Docker compose configuration for `vision_model` service.
  6. Create accuracy evaluation benchmark framework in `evaluation/` measuring Precision, Recall, F1, latency percentiles, and failure rate.
  7. Add comprehensive unit tests for `LocalVisionAdapter` and `VisionRouterService`.
- **Validation Criteria**: 100% of existing regression tests pass (163/163); switching `VISION_PROVIDER=existing` maintains identical previous behavior; switching to `VISION_PROVIDER=local` with fallback executes seamlessly.

