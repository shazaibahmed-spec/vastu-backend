import { RoomTypeEnum } from './index.js';

// ─── Confidence Thresholds ────────────────────────────────────────────────────

/** Minimum confidence to consider a detection reliable for rule evaluation. */
export const CONFIDENCE_THRESHOLD_HIGH = 0.85;
/** Moderate confidence — include in results but flag as uncertain. */
export const CONFIDENCE_THRESHOLD_MEDIUM = 0.6;
/** Below this, detection is too unreliable for rule evaluation. */
export const CONFIDENCE_THRESHOLD_LOW = 0.3;
export const CONFIDENCE_LOW = CONFIDENCE_THRESHOLD_LOW;

/**
 * Derives a detection status tier from a numeric confidence value.
 */
export function confidenceToDetectionStatus(
  confidence: number,
): 'DETECTED' | 'UNCERTAIN' | 'NOT_DETECTED' {
  if (confidence >= CONFIDENCE_THRESHOLD_MEDIUM) return 'DETECTED';
  if (confidence >= CONFIDENCE_THRESHOLD_LOW) return 'UNCERTAIN';
  return 'NOT_DETECTED';
}

// ─── Image Quality Thresholds ─────────────────────────────────────────────────

/** Images below this mean luminance (0–255) are considered too dark. */
export const IMAGE_QUALITY_MIN_BRIGHTNESS = 30;
/** Images above this mean luminance (0–255) are considered overexposed. */
export const IMAGE_QUALITY_MAX_BRIGHTNESS = 245;
/** Minimum width or height in pixels for AI analysis. */
export const IMAGE_QUALITY_MIN_DIMENSION = 200;
/** Maximum file size in bytes accepted for processing (10 MB). */
export const IMAGE_QUALITY_MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Minimum file size to avoid empty/corrupt uploads. */
export const IMAGE_QUALITY_MIN_FILE_SIZE = 512;

// ─── Supported Vastu-Relevant Objects by Room Type ────────────────────────────

export const VASTU_OBJECTS_BY_ROOM: Readonly<Record<RoomTypeEnum, readonly string[]>> = {
  [RoomTypeEnum.BEDROOM]: [
    'bed', 'mattress', 'pillow', 'wardrobe', 'mirror',
    'window', 'door', 'dressing_table', 'television', 'desk',
    'chair', 'plant', 'electrical_appliance', 'nightstand', 'lamp',
  ],
  [RoomTypeEnum.LIVING_ROOM]: [
    'sofa', 'chair', 'table', 'television', 'tv_unit',
    'window', 'door', 'mirror', 'plant', 'aquarium',
    'water_feature', 'decorative_object', 'bookshelf', 'lamp',
  ],
  [RoomTypeEnum.KITCHEN]: [
    'gas_stove', 'stove', 'sink', 'refrigerator', 'microwave',
    'oven', 'kitchen_counter', 'window', 'door', 'exhaust',
    'water_source', 'dishwasher', 'cabinet',
  ],
  [RoomTypeEnum.MAIN_ENTRANCE]: [
    'entrance_door', 'main_door', 'secondary_door', 'window',
    'staircase', 'shoe_rack', 'mirror', 'plant',
    'decorative_item', 'nameplate', 'doorbell',
  ],
  [RoomTypeEnum.OFFICE]: [
    'desk', 'chair', 'computer', 'monitor', 'cabinet',
    'window', 'door', 'plant', 'safe', 'storage',
    'electrical_equipment', 'bookshelf', 'printer',
  ],
} as const;

// ─── Vision Prompt Version ────────────────────────────────────────────────────

/** Current version of the vision system/user prompt template. */
export const VISION_PROMPT_VERSION = 'v2.0';
