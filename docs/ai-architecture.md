# AI Provider Architecture & Prompt Engineering

## 1. Provider-Agnostic AI Strategy

To avoid vendor lock-in, insulate business logic, and permit switching between OpenAI, Anthropic, Google Gemini, or local models, all AI interactions are isolated behind **Domain Ports** (TypeScript interfaces).

```
                      ┌────────────────────────────┐
                      │    AnalysisService (App)   │
                      └─────────────┬──────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  VisionRouterService  │       │   LLMProvider Port    │
        │ (VisionProvider Port) │       │                       │
        └───────────┬───────────┘       └───────────┬───────────┘
                    │                               │
        ┌───────────┼───────────┬───────────┐       ┌───────────┬───────────┐
        ▼           ▼           ▼           ▼       ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐┌─────────┐ ┌─────────┐ ┌─────────┐
   │ Google  │ │ OpenAI  │ │  Local  │ │  Mock   ││ Gemini  │ │ OpenAI  │ │  Mock   │
   │ Gemini  │ │ Vision  │ │ YOLOv8  │ │ Vision  ││   LLM   │ │   LLM   │ │   LLM   │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘└─────────┘ └─────────┘ └─────────┘
```

---

## 2. Vision Provider Port (`VisionProvider`)

### 2.1. TypeScript Port Interface
```typescript
export interface VisionAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  roomType: RoomType;
  headingDegrees?: number;
  calibratedDirection?: Direction;
}

export interface DetectedSpatialObject {
  objectType: string;               // e.g. 'bed', 'gas_stove', 'mirror', 'desk', 'window'
  label: string;                    // Human description, e.g. "Double wooden bed"
  zone: Direction;                  // Calculated spatial octant e.g. 'NORTH_EAST'
  relativePosition: {
    x: number;                      // 0.0 (left) to 1.0 (right)
    y: number;                      // 0.0 (top) to 1.0 (bottom)
  };
  boundingBox?: {                   // Normalized 0.0–1.0 bounding box
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;               // 0.0 to 1.0
  detectionStatus?: 'DETECTED' | 'UNCERTAIN' | 'NOT_DETECTED';
  attributes: Record<string, any>;   // e.g. { headboardDirection: 'NORTH', reflectsBed: true }
}

export interface VisionAnalysisResult {
  roomTypeDetected: RoomType;
  roomTypeConfidence: number;       // 0.0 to 1.0
  roomTypeSource: 'USER_PROVIDED' | 'VISION_MODEL';
  detectedObjects: DetectedSpatialObject[];
  qualityAssessment: {
    isClear: boolean;
    lighting: 'POOR' | 'MODERATE' | 'GOOD';
    isBlurry: boolean;
    isArchitecturalSpace: boolean;
    score: number;                  // 0.0 to 1.0 overall score
    usable: boolean;
    issues: string[];
  };
  observations: string[];
  rawModelName: string;
  processingMetadata?: {
    modelName: string;
    promptVersion: string;
    processingDurationMs: number;
    imageDimensions?: { width: number; height: number };
    imageSizeBytes?: number;
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  };
}

export interface VisionProvider {
  analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult>;
}
```

### 2.2. Schema Validation (Zod)
External AI output is untrusted data. Before parsing, the JSON response is passed to a strict Zod parser:
```typescript
export const DetectedSpatialObjectSchema = z.object({
  objectType: z.string().min(2).max(50),
  label: z.string().min(2).max(100),
  zone: z.enum([
    'NORTH', 'NORTH_EAST', 'EAST', 'SOUTH_EAST',
    'SOUTH', 'SOUTH_WEST', 'WEST', 'NORTH_WEST', 'CENTER'
  ]),
  relativePosition: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.any()).default({}),
});

export const VisionAnalysisResultSchema = z.object({
  roomTypeDetected: z.enum(['BEDROOM', 'LIVING_ROOM', 'KITCHEN', 'MAIN_ENTRANCE', 'OFFICE']),
  detectedObjects: z.array(DetectedSpatialObjectSchema),
  qualityAssessment: z.object({
    isClear: z.boolean(),
    lighting: z.enum(['POOR', 'MODERATE', 'GOOD']),
    isBlurry: z.boolean(),
  }),
  observations: z.array(z.string()),
});
```

---

## 3. LLM Provider Port (`LLMProvider`)

### 3.1. TypeScript Port Interface
```typescript
export interface ExplanationFindingInput {
  ruleCode: string;
  category: string;
  verdict: 'COMPLIANT' | 'DEFECT' | 'NEUTRAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetObject: string;
  zone: Direction;
  canonicalDescription: string;
  defaultRemedyText?: string;
}

export interface ExplanationInput {
  roomType: RoomType;
  overallScore: number;
  scoreBand: string;
  language?: SupportedLanguageEnum;
  findings: ExplanationFindingInput[];
  userNotes?: string;
}

export interface ExplanationResult {
  summary: string;
  elementalBalance: {
    fire: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    water: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    earth: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    air: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    space: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
  };
  findingExplanations: Array<{
    ruleCode: string;
    laymanExplanation: string;
    actionableRemedy: string;
    remedyType: 'STRUCTURAL' | 'ELEMENTAL' | 'DECORATIVE' | 'COLOR';
  }>;
  promptVersion?: string;
  modelVersion?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateExplanation(input: ExplanationInput): Promise<ExplanationResult>;
}
```

---

## 4. Prompt Engineering Directives

### 4.1. Vision AI Prompt (Factual Observer Only)
```text
SYSTEM:
You are an expert architectural computer vision engine. Your sole job is to identify physical objects, room boundaries, and spatial coordinates from the user's photograph.
DO NOT provide any Vastu Shastra rules, advice, or astrological commentary. You are strictly a computer vision observer.

Context:
- Declared Room Type: {{roomType}}
- Camera Forward Bearing (Heading): {{headingDegrees}} degrees (Zone: {{calibratedDirection}})

Instructions:
1. Identify all primary furniture and architectural fixtures relevant to this room type.
2. Determine their approximate bounding box / normalized coordinates (x: 0..1, y: 0..1).
3. Using the camera forward heading, compute each detected object's cardinal/ordinal zone in the room.
4. Assess image clarity and lighting.
5. Return ONLY a valid JSON object strictly conforming to the VisionAnalysisResult schema.
```

### 4.2. LLM Synthesis Prompt (Language-Aware Empathetic Explainer)
```text
SYSTEM:
You are an empathetic, authoritative classical Vastu Shastra architectural consultant.

CRITICAL LINGUISTIC REQUIREMENT:
You MUST respond EXCLUSIVELY in {{targetLanguageName}} (ISO code: "{{targetLanguageCode}}").
- Every explanation, remedy title, practical action, and summary must be fluently written in {{targetLanguageName}} script.
- Do NOT translate or modify technical rule codes, severity enums, or verdict enums.
- Return ONLY a valid, parseable JSON object strictly conforming to the requested schema.

CRITICAL VASTU CONSTRAINT:
You must NEVER invent or modify Vastu rules. You are provided with a deterministic list of rule evaluation verdicts and canonical remedies generated by the Vastu Rules Engine.
Your task is to translate these technical verdicts into reassuring, constructive, and practical guidance in {{targetLanguageName}}.

Input Data:
- Room Type: {{roomType}}
- Overall Score: {{overallScore}} / 100 (Band: {{scoreBand}})
- Requested Language: {{targetLanguageName}} ({{targetLanguageCode}})
- Evaluated Findings:
{{#each findings}}
  * [{{verdict}}] {{ruleCode}}: {{targetObject}} in {{zone}} (Severity: {{severity}})
    Canonical Description: {{canonicalDescription}}
    Canonical Remedy: {{defaultRemedyText}}
{{/each}}

Tone and Guidelines:
1. Never induce fear, superstition, or panic. Emphasize that elemental remedies can harmonize any space without major renovation.
2. Formulate practical remedies (lighting adjustments, color therapy, plant additions, mirror repositioning, furniture rearrangement) in {{targetLanguageName}}.
3. Return ONLY a valid JSON response conforming to the ExplanationResult schema.
```

---

## 5. Operational Resilience & Fault Tolerance

| Threat / Failure Mode | Engineering Mitigation |
| :--- | :--- |
| **API Timeout** | Hard request timeouts via `AbortController` (Vision: 15s, LLM: 10s). |
| **Transient 429/500/503** | Exponential backoff retry with random jitter (`maxRetries = 2`, initial delay 1000ms). |
| **Malformed / Truncated JSON** | Output repair via JSON parse sanitizers + strict Zod schema fallback. If unparseable, marks state `FAILED_AI_ANALYSIS`. |
| **Prompt Injection** | User notes are strictly delimited using XML tags (`<user_notes>...</user_notes>`) and sanitized. |
| **Excessive Cost / Quota Burn** | Images downscaled to max 2048px; max tokens capped on completions; token usage logged per analysis for telemetry. |
