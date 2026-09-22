import {
  DirectionEnum,
  DirectionSourceEnum,
  RoomTypeEnum,
} from '../../../common/constants/index.js';

// ─── Input ────────────────────────────────────────────────────────────────────

export interface VisionAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  roomType: RoomTypeEnum;
  headingDegrees?: number;
  calibratedDirection?: DirectionEnum;
  directionSource?: DirectionSourceEnum;
}

// ─── Detected Object ──────────────────────────────────────────────────────────

/**
 * Normalized bounding box in image-relative coordinates (0.0–1.0).
 * Origin is top-left corner of the image.
 */
export interface NormalizedBoundingBox {
  /** Left edge, 0.0 = left side of image, 1.0 = right side */
  x: number;
  /** Top edge, 0.0 = top of image, 1.0 = bottom */
  y: number;
  /** Width as fraction of image width */
  width: number;
  /** Height as fraction of image height */
  height: number;
}

/** Whether the detection was confident, uncertain, or absent. */
export type DetectionStatus = 'DETECTED' | 'UNCERTAIN' | 'NOT_DETECTED';

export interface DetectedSpatialObject {
  objectType: string; // e.g. 'bed', 'gas_stove', 'sink', 'mirror', 'desk'
  label: string;
  zone: DirectionEnum;
  relativePosition: {
    x: number; // 0.0 to 1.0 (left to right)
    y: number; // 0.0 to 1.0 (top to bottom)
  };
  confidence: number; // 0.0 to 1.0
  attributes: Record<string, unknown>;

  /** Optional pixel-level bounding box from vision model (normalized 0–1). */
  boundingBox?: NormalizedBoundingBox;

  /** Confidence tier derived from the numeric `confidence` value. */
  detectionStatus?: DetectionStatus;
}

// ─── Image Quality ────────────────────────────────────────────────────────────

export interface ImageQualityAssessment {
  /** Whether the image is clear enough for analysis. */
  isClear: boolean;
  /** Overall lighting condition. */
  lighting: 'POOR' | 'MODERATE' | 'GOOD';
  /** Whether excessive blur was detected. */
  isBlurry: boolean;
  /** Whether the photograph depicts an indoor architectural space. */
  isArchitecturalSpace?: boolean;
  /** Numeric quality score from 0.0 (unusable) to 1.0 (excellent). */
  score?: number;
  /** Whether the image is usable for Vastu analysis. */
  usable?: boolean;
  /** List of specific quality issues detected (e.g. 'TOO_DARK', 'EXCESSIVE_BLUR'). */
  issues?: string[];
}

// ─── Room Type Classification ─────────────────────────────────────────────────

export type RoomTypeSource = 'USER_PROVIDED' | 'VISION_MODEL';

// ─── Processing Metadata ──────────────────────────────────────────────────────

export interface VisionProcessingMetadata {
  /** Identifier of the vision provider (e.g. 'local', 'gemini', 'openai', 'mock'). */
  provider?: string;
  /** Name of the model used for analysis. */
  modelName: string;
  /** Version of the model used, if applicable. */
  modelVersion?: string;
  /** Prompt template version identifier. */
  promptVersion: string;
  /** Total round-trip processing time in milliseconds. */
  processingDurationMs: number;
  /** Dimensions of the image sent to the model. */
  imageDimensions?: { width: number; height: number };
  /** Image size in bytes sent to the model. */
  imageSizeBytes?: number;
  /** Token usage reported by the model, if available. */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface VisionAnalysisResult {
  roomTypeDetected: RoomTypeEnum;
  detectedObjects: DetectedSpatialObject[];
  qualityAssessment: ImageQualityAssessment;
  observations: string[];
  rawModelName: string;

  /** Confidence of the room type classification (0.0–1.0). */
  roomTypeConfidence?: number;

  /** Whether the room type was provided by the user or detected by the model. */
  roomTypeSource?: RoomTypeSource;

  /** Instrumentation metadata for cost/performance tracking. */
  processingMetadata?: VisionProcessingMetadata;
}

// ─── Provider Port ────────────────────────────────────────────────────────────

export interface VisionProvider {
  analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult>;
}
