import { z } from 'zod';
import {
  DirectionEnum,
  RoomTypeEnum,
} from '../../../common/constants/index.js';

// ─── Bounding Box ─────────────────────────────────────────────────────────────

export const NormalizedBoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

// ─── Detected Object ──────────────────────────────────────────────────────────

export const DetectedSpatialObjectSchema = z.object({
  objectType: z.string().min(2).max(50),
  label: z.string().min(2).max(100),
  zone: z.nativeEnum(DirectionEnum),
  relativePosition: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.string(), z.any()).default({}),
  boundingBox: NormalizedBoundingBoxSchema.optional(),
  detectionStatus: z
    .enum(['DETECTED', 'UNCERTAIN', 'NOT_DETECTED'])
    .default('DETECTED'),
});

// ─── Image Quality ────────────────────────────────────────────────────────────

export const ImageQualityAssessmentSchema = z.object({
  isClear: z.boolean().default(true),
  lighting: z.enum(['POOR', 'MODERATE', 'GOOD']).default('GOOD'),
  isBlurry: z.boolean().default(false),
  isArchitecturalSpace: z.boolean().default(true),
  score: z.number().min(0).max(1).default(0.85),
  usable: z.boolean().default(true),
  issues: z.array(z.string()).default([]),
});

// ─── Processing Metadata ──────────────────────────────────────────────────────

export const VisionProcessingMetadataSchema = z.object({
  provider: z.string().optional(),
  modelName: z.string(),
  modelVersion: z.string().optional(),
  promptVersion: z.string(),
  processingDurationMs: z.number().min(0),
  imageDimensions: z
    .object({ width: z.number(), height: z.number() })
    .optional(),
  imageSizeBytes: z.number().min(0).optional(),
  tokenUsage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

// ─── Vision Analysis Result ───────────────────────────────────────────────────

export const VisionAnalysisResultSchema = z.object({
  roomTypeDetected: z.nativeEnum(RoomTypeEnum),
  detectedObjects: z.array(DetectedSpatialObjectSchema),
  qualityAssessment: ImageQualityAssessmentSchema,
  observations: z.array(z.string()).default([]),
  rawModelName: z.string().default('unknown-model'),
  roomTypeConfidence: z.number().min(0).max(1).default(0.85),
  roomTypeSource: z.enum(['USER_PROVIDED', 'VISION_MODEL']).default('VISION_MODEL'),
  processingMetadata: VisionProcessingMetadataSchema.optional(),
});

