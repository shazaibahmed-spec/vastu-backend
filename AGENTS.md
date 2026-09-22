# AGENTS.md — Developer & AI Agent Operating Manual

> **Primary Source of Truth** for all developers and AI coding agents working on the Vastu AI backend.
> Every modification, new module, or refactoring in this repository must strictly adhere to the principles and constraints outlined in this document.

---

## 1. Project Principles

1. **Production-Quality First**: No shortcut hacks, mock-only implementations in production paths, or dead-end code. Every piece of code must be production-ready, typed, validated, and logged.
2. **TypeScript Strict Mode**: Zero `any` types unless mathematically unavoidable (and must be documented with explicit justification). Use strict null checks, discriminating unions, and readonly properties where applicable.
3. **Clean Architecture & Modular Monolith**:
   - Strict separation of concerns: Presentation (Controllers/DTOs) → Application (Use Cases/Services) → Domain (Vastu Rules, Core Entities, Value Objects) → Infrastructure (Prisma, Cloud Storage, AI Adapters).
   - High cohesion within modules; low coupling across modules.
   - Do NOT build distributed microservices for V1. Build a clean, modular monolith with distinct boundary interfaces so modules can be extracted later if necessary.
4. **Dependency Inversion**:
   - High-level business logic must never depend directly on low-level third-party SDKs (OpenAI, AWS S3, Prisma, etc.).
   - All external integrations (AI Vision, LLM, Storage, Event Emitters) must sit behind TypeScript interfaces (Ports) with concrete adapter implementations (Adapters).
5. **Deterministic Vastu Rules Engine**:
   - **CRITICAL**: The LLM must NEVER freely invent, alter, or interpret authoritative Vastu rules.
   - Vastu rules are deterministic, mathematically defined, testable in isolation, and maintained in code/database tables.
   - The AI/Vision layer is solely responsible for **visual understanding and factual detection** (identifying objects, room boundaries, approximate coordinates, and orientations).
   - The AI/LLM layer is solely responsible for **converting deterministic findings into empathetic, human-readable explanations and practical remedies**.
6. **Security by Default**:
   - Principle of least privilege.
   - Validate and sanitize all inputs at boundaries via class-validator DTOs and Zod schemas.
   - File uploads must undergo magic-byte MIME inspection and sanitization. Private storage must not be exposed to the public Internet without pre-signed temporal tokens.
   - Never log secrets, passwords, or PII.
7. **Multilingual Architecture & Separation of Localization**:
   - **Centralized Language Enum**: `SupportedLanguageEnum` in `backend/src/common/constants` is the sole source of truth (supporting `en`, `hi`, `ta`, `te`, `kn`, `ml`, `bn`, `gu`, `mr`, `pa`).
   - **Strict UI vs AI Separation**: Mobile app UI strings are localized client-side in resource bundles (`app/src/i18n/locales/`). NEVER send static UI labels to the AI.
   - **Language-Agnostic Core**: The deterministic Vastu Rules Engine operates strictly on domain data and emits language-independent ASCII codes (`ruleCode`, `severity`, `verdict`, `remedyType`). Internal codes and database IDs must NEVER be translated.
   - **Dynamic AI Synthesis**: The LLM synthesizes natural-language explanations and practical remedies in the requested language, strictly validated via Zod schema.
   - **Historical Immutability & Auditing**: Analyses persist `languageCode`, `promptVersion`, and `modelVersion`. Historical reports retain their creation language.
   - **UTF-8 & Unicode Integrity**: All layers (API, DB, logs, fonts) enforce UTF-8 with zero ASCII assumptions.

---

## 2. Directory Structure & Module Responsibilities

All backend application code lives under `backend/`.

```
backend/
├── src/
│   ├── main.ts                     # Application bootstrap, Global Pipes, Filters, Interceptors, Swagger
│   ├── app.module.ts               # Root module wiring
│   ├── common/                     # Cross-cutting concerns & shared utilities
│   │   ├── constants/              # System-wide constants & enums
│   │   ├── decorators/             # Custom param & route decorators (@CurrentUser, @Public)
│   │   ├── dto/                    # Standard API pagination & response envelopes
│   │   ├── exceptions/             # Domain exceptions & standard AppExceptions
│   │   ├── filters/                # Global HttpExceptionFilter & PrismaExceptionFilter
│   │   ├── guards/                 # JwtAuthGuard, RolesGuard, ThrottlerGuard
│   │   ├── interceptors/           # LoggingInterceptor, TransformResponseInterceptor, TimeoutInterceptor
│   │   ├── pipes/                  # Custom validation pipes, ParseDirectionPipe
│   │   └── utils/                  # Mathematical utils (compass angles, vector mapping, hashing)
│   ├── config/                     # Typed configuration service using @nestjs/config & Joi validation
│   │   ├── app.config.ts
│   │   ├── auth.config.ts
│   │   ├── database.config.ts
│   │   ├── storage.config.ts
│   │   └── ai.config.ts
│   ├── database/                   # Prisma Client, Seeders, Migration scripts
│   │   ├── prisma.service.ts       # NestJS lifecycle-aware Prisma client
│   │   └── seeds/                  # Seed scripts for initial Vastu rules & reference data
│   └── modules/                    # Feature modules (Domain-driven)
│       ├── auth/                   # Authentication, JWT strategy, refresh token rotation, bcrypt hashing
│       ├── users/                  # User entity management, profile, preferences
│       ├── storage/                # Abstract file storage port & local/S3/R2 adapters
│       ├── ai/                     # Abstract AI ports, VisionProvider, LLMProvider, vendor adapters
│       ├── vastu/                  # Deterministic Vastu Rules Engine (evaluator, rule registry, score calculator)
│       ├── analysis/               # Analysis orchestrator, state machine, pipeline coordinator
│       └── reports/                # Report generation, PDF/JSON export, historical aggregations
├── prisma/
│   ├── schema.prisma               # Prisma relational schema
│   └── migrations/                 # Version-controlled SQL migrations
├── test/                           # E2E & integration test suites
├── docker-compose.yml              # Local development infrastructure (Postgres, local S3/MinIO)
├── package.json
└── tsconfig.json
```

### Module Boundary Rules

1. **Controllers** only handle HTTP transport: extracting headers, parsing route/query params, triggering use-cases, and returning DTOs. Zero business logic inside controllers.
2. **Services / Use Cases** coordinate domain logic and infrastructure ports. They do not manipulate HTTP request/response objects directly.
3. **`vastu` Module** has **ZERO** dependency on the `ai` module. The Vastu engine operates purely on structured domain inputs (`RoomType`, `DetectedObject[]`, `CompassOrientation`).
4. **`ai` Module** is purely an infrastructure adapter layer implementing domain ports (`VisionProvider`, `LLMProvider`). It parses images and formats explanations, returning structured Zod-validated models.
5. **Circular Dependencies** are strictly forbidden. Use NestJS `forwardRef()` only as an extreme last resort and require architectural sign-off.

---

## 3. Coding Standards & Conventions

### TypeScript & Linting
- Strict mode is enabled (`"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`).
- Use ESLint and Prettier. Run `npm run lint` and `npm run format` prior to committing.
- Prefer `type` for unions/tuples and `interface` for object shapes, contracts, and injectable services.
- Never use magic strings or numbers. Define descriptive `enum`s or `const` objects (e.g., `DirectionEnum`, `RoomTypeEnum`, `AnalysisStatusEnum`).

### DTOs & Validation
- Every incoming endpoint MUST define a dedicated request DTO class.
- Use `class-validator` decorators (`@IsString`, `@IsEnum`, `@IsNumber`, `@Min`, `@Max`, `@IsOptional`) and `class-transformer` (`@Type`).
- Global `ValidationPipe` must be configured with:
  ```typescript
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  })
  ```
- Every outgoing response should be represented by a response DTO or wrapped in the standard `ApiResponseEnvelope<T>`.

### Error Handling & Exceptions
- Never throw raw generic `new Error('message')` from services.
- Throw strongly-typed custom domain exceptions (e.g., `AnalysisNotFoundException`, `InvalidDirectionException`, `AiProviderException`, `UnsupportedImageFormatException`).
- The global `HttpExceptionFilter` will catch and transform domain exceptions into standard RFC-7807 problem details or standard API error envelope:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "error": "Bad Request",
    "message": "Compass heading must be a number between 0 and 360 degrees.",
    "code": "INVALID_DIRECTION_HEADING",
    "timestamp": "2026-09-10T11:24:00.000Z",
    "path": "/api/v1/analysis",
    "correlationId": "c8f5f0b4-7b9c-497f-94d5-5d93375be26e"
  }
  ```

### Logging & Observability
- Do not use `console.log`. Use NestJS built-in `Logger` with structured contextual tags: `private readonly logger = new Logger(AnalysisService.name)`.
- Log with correlation/request IDs (`x-request-id`).
- Never log passwords, tokens, full image binary buffers, or private S3 presigned URLs.
- Track AI latency, prompt token counts, and completion token counts in logs for observability and cost auditing.

---

## 4. API Standards

- **Prefix**: All REST routes must be prefixed with `/api/v1/`.
- **HTTP Verbs**:
  - `POST`: Create resource or initiate state transition.
  - `GET`: Retrieve resource or paginated list.
  - `PATCH`: Partial updates.
  - `DELETE`: Soft-delete or remove resource.
- **Pagination**:
  - Standard query parameters: `page` (default: 1, min: 1), `limit` (default: 20, max: 100), `sortBy`, `sortOrder` (`ASC` | `DESC`).
- **OpenAPI / Swagger**:
  - Every controller and endpoint must have `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, and `@ApiBearerAuth()`.
  - Document all request bodies, params, and response DTO schemas completely.

---

## 5. Database & Persistence Rules

- **Database Engine**: PostgreSQL 16+.
- **ORM**: Prisma ORM.
- **Schema Management**:
  - Every schema change must be applied via a versioned migration: `npx prisma migrate dev --name <descriptive_name>`.
  - Never manually execute DDL on production or development databases without a checked-in Prisma migration.
- **Transactions**:
  - Multi-entity writes (e.g., creating Analysis + AnalysisInput + AnalysisImage) must run inside `prisma.$transaction()`.
- **Soft Deletes**:
  - Analyses, Users, and Reports utilize `deletedAt: DateTime?` timestamps for auditability and recovery.
- **Indexes**:
  - Mandatory compound/foreign-key indexes on frequently queried fields (e.g., `[userId, createdAt]`, `[analysisId]`, `[roomType]`).

---

## 6. AI & Vastu Rules Engine Architecture

### The Golden Rule
```
[Vision AI]  ──(Detects visual facts)──►  [DetectedObjects + Layout]
                                                   │
                                                   ▼
                                       [Vastu Rules Engine] (Deterministic)
                                                   │
                                                   ▼
                                          [Verified Findings]
                                                   │
                                                   ▼
[LLM AI]     ◄──(Translates findings)──── [Explanations & Remedies]
```

### Vision Abstraction (`VisionProvider`)
```typescript
export interface VisionAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  roomType: RoomType;
  primaryDirection: CompassDirection;
  headingDegrees?: number;
}

export interface DetectedObjectFact {
  objectType: string;               // e.g., 'bed', 'stove', 'door', 'mirror'
  label: string;
  zone: CompassDirection;           // North, North-East, South, etc.
  relativePosition: { x: number; y: number }; // Normalized 0..1 coordinates
  confidence: number;               // 0.0 - 1.0
  attributes: Record<string, any>;   // e.g., { headboardOrientation: 'NORTH', material: 'WOOD' }
}

export interface VisionAnalysisResult {
  roomTypeDetected: RoomType;
  confidence: number;
  detectedObjects: DetectedObjectFact[];
  layoutObservations: string[];
  qualityAssessment: {
    isClear: boolean;
    lighting: 'GOOD' | 'POOR' | 'MODERATE';
    obstructionsDetected: boolean;
  };
}

export interface VisionProvider {
  analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult>;
}
```

### Vision Provider Architecture & Local Self-Hosted Model
The backend supports multiple vision detection implementations behind `VisionProvider`:
- **Existing Cloud Providers**: `GeminiVisionAdapter`, `OpenAiVisionAdapter`
- **Mock Provider**: `MockVisionAdapter` (used for test suites and offline development)
- **Local Model Provider**: `LocalVisionAdapter` (routes to self-hosted FastAPI + YOLOv8 service in `services/vision-model/`)

**Vision Routing & Fallback**:
`VisionRouterService` implements `VisionProvider` and dynamically routes based on environment:
- `VISION_PROVIDER`: `'existing' | 'local' | 'mock' | 'gemini' | 'openai'` (default: `existing`)
- `EXISTING_VISION_PROVIDER`: `'mock' | 'gemini' | 'openai'` (default: `mock`)
- `VISION_FALLBACK_ENABLED`: `true | false` (default: `false`)
- `VISION_FALLBACK_PROVIDER`: `'existing' | 'gemini' | 'openai' | 'mock'` (default: `existing`)

When `VISION_FALLBACK_ENABLED=true`, technical failures (timeouts, network errors, 5xx) in the primary provider automatically trigger a fallback execution to the configured fallback provider without breaking user analysis requests.
All outputs are strictly validated against `VisionAnalysisResultSchema` and normalized prior to consumption by the Vastu Rules Engine.

### LLM Abstraction (`LLMProvider`)
```typescript
export interface ExplanationInput {
  roomType: RoomType;
  overallScore: number;
  language?: SupportedLanguageEnum;
  findings: Array<{
    ruleCode: string;
    verdict: 'COMPLIANT' | 'DEFECT' | 'NEUTRAL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    objectType: string;
    zone: CompassDirection;
    standardRemedyText: string;
  }>;
  userContext?: {
    notes?: string;
  };
}

export interface ExplanationResult {
  summary: string;
  elementalBalanceAnalysis: {
    fire: string;
    water: string;
    earth: string;
    air: string;
    space: string;
  };
  findingExplanations: Array<{
    ruleCode: string;
    laymanExplanation: string;
    actionableRemedy: string;
    remedyType: 'STRUCTURAL' | 'ELEMENTAL' | 'DECORATIVE' | 'COLOR';
  }>;
  promptVersion?: string;
  modelVersion?: string;
}

export interface LLMProvider {
  generateExplanation(input: ExplanationInput): Promise<ExplanationResult>;
}
```

### Vastu Rule Schema
Rules are stored deterministically as evaluation predicates. Example in TypeScript/JSON:
```json
{
  "code": "BED-001-HEAD-POS",
  "roomType": "BEDROOM",
  "targetObject": "bed",
  "severity": "HIGH",
  "condition": {
    "field": "attributes.headboardOrientation",
    "operator": "EQUALS",
    "value": "NORTH"
  },
  "verdictOnMatch": "DEFECT",
  "name": "Head Placement Towards North",
  "standardDescription": "Sleeping with head towards North causes magnetic disturbance and restless sleep according to Vastu Shastra.",
  "defaultRemedy": "Reorient bed so headboard faces South or East."
}
```

---

## 7. Analysis State Machine

The analysis processing workflow must execute through defined states with guaranteed state transitions:

```
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

Every state change must be persisted with an updated timestamp and transition log.

---

## 8. Testing Commandments

1. **Unit tests are mandatory** for all:
   - Vastu rule evaluations (100% path coverage for every seeded rule).
   - Compass direction calculations (degree-to-zone conversion, 16-point sub-directions).
   - State machine transition guards.
   - DTO validation pipes.
2. **Never call live third-party AI APIs during tests**:
   - Inject `MockVisionProvider` and `MockLLMProvider` in all integration and E2E tests.
3. **Deterministic & Isolated**:
   - Tests must run independently with zero shared mutable state.

---

## 9. Work-in-Progress & Execution Guidelines

When working on any phase:
1. Check `docs/development-plan.md` to see the current active phase.
2. Ensure you touch only the relevant modules for the active phase.
3. Keep pull requests and changes small, tested, and strictly within the architectural boundary.
4. If a design ambiguity arises, check `docs/architecture.md` or consult the project lead before making assumptions.
