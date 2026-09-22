import {
  DirectionEnum,
  RoomTypeEnum,
} from '../../../common/constants/index.js';
import {
  confidenceToDetectionStatus,
  VISION_PROMPT_VERSION,
} from '../../../common/constants/vision.constants.js';
import type {
  NormalizedBoundingBox,
  VisionAnalysisResult,
} from '../interfaces/vision-provider.interface.js';
import { VisionAnalysisResultSchema } from '../schemas/vision-analysis.schema.js';

// ─── Value Normalizers ────────────────────────────────────────────────────────

export function normalizeRoomType(val: unknown, fallback: RoomTypeEnum): RoomTypeEnum {
  if (!val || typeof val !== 'string') return fallback;
  const upper = val.toUpperCase().replace(/[\s-]+/g, '_').trim();
  if (upper.includes('BED')) return RoomTypeEnum.BEDROOM;
  if (upper.includes('KITCHEN')) return RoomTypeEnum.KITCHEN;
  if (upper.includes('LIVING')) return RoomTypeEnum.LIVING_ROOM;
  if (
    upper.includes('ENTRANCE') ||
    upper.includes('DOOR') ||
    upper.includes('GATE') ||
    upper.includes('MAIN')
  ) {
    return RoomTypeEnum.MAIN_ENTRANCE;
  }
  if (
    upper.includes('OFFICE') ||
    upper.includes('STUDY') ||
    upper.includes('WORK')
  ) {
    return RoomTypeEnum.OFFICE;
  }
  return fallback;
}

export function normalizeDirection(val: unknown): DirectionEnum {
  if (!val || typeof val !== 'string') return DirectionEnum.NORTH;
  const upper = val.toUpperCase().replace(/[\s-]+/g, '_').trim();
  if (upper === 'N' || upper === 'NORTH') return DirectionEnum.NORTH;
  if (upper === 'NE' || upper.includes('NORTH_EAST') || upper.includes('NORTHEAST'))
    return DirectionEnum.NORTH_EAST;
  if (upper === 'E' || upper === 'EAST') return DirectionEnum.EAST;
  if (upper === 'SE' || upper.includes('SOUTH_EAST') || upper.includes('SOUTHEAST'))
    return DirectionEnum.SOUTH_EAST;
  if (upper === 'S' || upper === 'SOUTH') return DirectionEnum.SOUTH;
  if (upper === 'SW' || upper.includes('SOUTH_WEST') || upper.includes('SOUTHWEST'))
    return DirectionEnum.SOUTH_WEST;
  if (upper === 'W' || upper === 'WEST') return DirectionEnum.WEST;
  if (upper === 'NW' || upper.includes('NORTH_WEST') || upper.includes('NORTHWEST'))
    return DirectionEnum.NORTH_WEST;
  if (upper.includes('CENTER') || upper.includes('BRAHMA'))
    return DirectionEnum.CENTER;
  return DirectionEnum.NORTH;
}

export function normalizeLighting(val: unknown): 'POOR' | 'MODERATE' | 'GOOD' {
  if (!val || typeof val !== 'string') return 'GOOD';
  const upper = val.toUpperCase().trim();
  if (upper.includes('POOR') || upper.includes('DIM') || upper.includes('DARK'))
    return 'POOR';
  if (upper.includes('MOD')) return 'MODERATE';
  return 'GOOD';
}

export function normalizePosition(val: unknown): { x: number; y: number } {
  const obj = val as Record<string, unknown> | undefined;
  const xRaw = typeof obj?.x === 'number' ? obj.x : 0.5;
  const yRaw = typeof obj?.y === 'number' ? obj.y : 0.5;
  const x = xRaw >= 2 && xRaw <= 100 ? xRaw / 100 : Math.max(0, Math.min(1, xRaw));
  const y = yRaw >= 2 && yRaw <= 100 ? yRaw / 100 : Math.max(0, Math.min(1, yRaw));
  return { x, y };
}

export function normalizeConfidence(val: unknown): number {
  if (typeof val !== 'number') return 0.85;
  if (val >= 2 && val <= 100) return val / 100;
  return Math.max(0, Math.min(1, val));
}

export function normalizeBoundingBox(val: unknown): NormalizedBoundingBox | undefined {
  if (!val || typeof val !== 'object') return undefined;
  const obj = val as Record<string, unknown>;
  const x = typeof obj.x === 'number' ? Math.max(0, Math.min(1, obj.x)) : undefined;
  const y = typeof obj.y === 'number' ? Math.max(0, Math.min(1, obj.y)) : undefined;
  const width = typeof obj.width === 'number' ? Math.max(0, Math.min(1, obj.width)) : undefined;
  const height = typeof obj.height === 'number' ? Math.max(0, Math.min(1, obj.height)) : undefined;
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }
  return { x, y, width, height };
}

// ─── Full Result Normalizer ───────────────────────────────────────────────────

export interface NormalizationContext {
  provider?: string;
  fallbackRoomType: RoomTypeEnum;
  modelName: string;
  modelVersion?: string;
  durationMs: number;
  imageDimensions?: { width: number; height: number };
  imageSizeBytes?: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export function normalizeAndValidateVisionResult(
  rawJson: unknown,
  context: NormalizationContext,
): VisionAnalysisResult {
  const parsed = (typeof rawJson === 'object' && rawJson !== null ? rawJson : {}) as Record<
    string,
    unknown
  >;

  const rawObjects = Array.isArray(parsed.detectedObjects)
    ? (parsed.detectedObjects as Array<Record<string, unknown>>)
    : [];

  const normalizedObjects = rawObjects.map((obj) => {
    const conf = normalizeConfidence(obj.confidence);
    const box = normalizeBoundingBox(obj.boundingBox);
    return {
      objectType: String(obj.objectType || 'unknown').toLowerCase().trim(),
      label: String(obj.label || obj.objectType || 'Object').trim(),
      zone: normalizeDirection(obj.zone),
      relativePosition: normalizePosition(obj.relativePosition),
      boundingBox: box,
      confidence: conf,
      detectionStatus: confidenceToDetectionStatus(conf),
      attributes: (() => {
        const rawAttrs =
          typeof obj.attributes === 'object' && obj.attributes !== null
            ? { ...(obj.attributes as Record<string, unknown>) }
            : {};
        const headDir =
          rawAttrs.headboardDirection ||
          rawAttrs.headboardOrientation ||
          rawAttrs.orientation;
        if (headDir && typeof headDir === 'string') {
          const normDir = normalizeDirection(headDir);
          rawAttrs.headboardDirection = normDir;
          rawAttrs.headboardOrientation = normDir;
        }
        return rawAttrs;
      })(),
    };
  });

  const qualityRaw = parsed.qualityAssessment as Record<string, unknown> | undefined;

  const normalized = {
    roomTypeDetected: normalizeRoomType(parsed.roomTypeDetected, context.fallbackRoomType),
    roomTypeConfidence: normalizeConfidence(parsed.roomTypeConfidence ?? 0.85),
    roomTypeSource: 'VISION_MODEL' as const,
    detectedObjects: normalizedObjects,
    qualityAssessment: {
      isClear: Boolean(qualityRaw?.isClear ?? true),
      lighting: normalizeLighting(qualityRaw?.lighting),
      isBlurry: Boolean(qualityRaw?.isBlurry ?? false),
      isArchitecturalSpace: Boolean(qualityRaw?.isArchitecturalSpace ?? true),
      score: normalizeConfidence(qualityRaw?.score ?? 0.85),
      usable: Boolean(qualityRaw?.usable ?? true),
      issues: Array.isArray(qualityRaw?.issues)
        ? (qualityRaw.issues as unknown[]).map(String)
        : [],
    },
    observations: Array.isArray(parsed.observations)
      ? (parsed.observations as unknown[]).map(String)
      : [],
    rawModelName: context.modelName,
    processingMetadata: {
      provider: context.provider,
      modelName: context.modelName,
      modelVersion: context.modelVersion,
      promptVersion: VISION_PROMPT_VERSION,
      processingDurationMs: context.durationMs,
      imageDimensions: context.imageDimensions,
      imageSizeBytes: context.imageSizeBytes,
      tokenUsage: context.tokenUsage,
    },
  };

  return VisionAnalysisResultSchema.parse(normalized) as VisionAnalysisResult;
}
