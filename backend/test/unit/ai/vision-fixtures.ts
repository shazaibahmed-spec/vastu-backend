import {
  DirectionEnum,
  RoomTypeEnum,
} from '../../../src/common/constants/index.js';
import { VISION_PROMPT_VERSION } from '../../../src/common/constants/vision.constants.js';
import type { VisionAnalysisResult } from '../../../src/modules/ai/interfaces/vision-provider.interface.js';

// ─── Standard Room Fixtures ───────────────────────────────────────────────────

export const BEDROOM_FIXTURE: VisionAnalysisResult = {
  roomTypeDetected: RoomTypeEnum.BEDROOM,
  roomTypeConfidence: 0.96,
  roomTypeSource: 'VISION_MODEL',
  detectedObjects: [
    {
      objectType: 'bed',
      label: 'King Size Master Bed',
      zone: DirectionEnum.SOUTH,
      relativePosition: { x: 0.5, y: 0.5 },
      confidence: 0.94,
      detectionStatus: 'DETECTED',
      boundingBox: { x: 0.2, y: 0.25, width: 0.6, height: 0.5 },
      attributes: {
        headboardDirection: DirectionEnum.SOUTH,
        headboardOrientation: DirectionEnum.SOUTH,
      },
    },
    {
      objectType: 'mirror',
      label: 'Dressing Mirror',
      zone: DirectionEnum.NORTH,
      relativePosition: { x: 0.8, y: 0.3 },
      confidence: 0.88,
      detectionStatus: 'DETECTED',
      boundingBox: { x: 0.75, y: 0.15, width: 0.15, height: 0.4 },
      attributes: {
        reflectsBed: false,
      },
    },
  ],
  qualityAssessment: {
    isClear: true,
    lighting: 'GOOD',
    isBlurry: false,
    isArchitecturalSpace: true,
    score: 0.92,
    usable: true,
    issues: [],
  },
  observations: [
    'Bed headboard positioned against South wall.',
    'Dressing mirror installed on North wall.',
  ],
  rawModelName: 'gemini-3.5-flash',
  processingMetadata: {
    modelName: 'gemini-3.5-flash',
    promptVersion: VISION_PROMPT_VERSION,
    processingDurationMs: 1420,
    imageDimensions: { width: 1024, height: 768 },
    imageSizeBytes: 42500,
  },
};

export const KITCHEN_FIXTURE: VisionAnalysisResult = {
  roomTypeDetected: RoomTypeEnum.KITCHEN,
  roomTypeConfidence: 0.95,
  roomTypeSource: 'VISION_MODEL',
  detectedObjects: [
    {
      objectType: 'gas_stove',
      label: '4-Burner Gas Cooktop',
      zone: DirectionEnum.SOUTH_EAST,
      relativePosition: { x: 0.7, y: 0.6 },
      confidence: 0.93,
      detectionStatus: 'DETECTED',
      boundingBox: { x: 0.6, y: 0.5, width: 0.25, height: 0.2 },
      attributes: {
        facingDirection: DirectionEnum.EAST,
      },
    },
    {
      objectType: 'kitchen_sink',
      label: 'Stainless Steel Double Sink',
      zone: DirectionEnum.NORTH_EAST,
      relativePosition: { x: 0.2, y: 0.5 },
      confidence: 0.9,
      detectionStatus: 'DETECTED',
      boundingBox: { x: 0.1, y: 0.45, width: 0.2, height: 0.2 },
      attributes: {},
    },
  ],
  qualityAssessment: {
    isClear: true,
    lighting: 'GOOD',
    isBlurry: false,
    isArchitecturalSpace: true,
    score: 0.88,
    usable: true,
    issues: [],
  },
  observations: [
    'Stove in Agni (South-East) zone.',
    'Sink in Ishanya (North-East) water zone.',
  ],
  rawModelName: 'gemini-3.5-flash',
};

// ─── Edge Case Fixtures ────────────────────────────────────────────────────────

export const POOR_QUALITY_FIXTURE: VisionAnalysisResult = {
  roomTypeDetected: RoomTypeEnum.BEDROOM,
  roomTypeConfidence: 0.25,
  roomTypeSource: 'VISION_MODEL',
  detectedObjects: [],
  qualityAssessment: {
    isClear: false,
    lighting: 'POOR',
    isBlurry: true,
    isArchitecturalSpace: true,
    score: 0.15,
    usable: false,
    issues: ['TOO_DARK', 'EXCESSIVE_BLUR'],
  },
  observations: ['Photograph is underexposed and blurry.'],
  rawModelName: 'gemini-3.5-flash',
};

export const NON_ARCHITECTURAL_FIXTURE: VisionAnalysisResult = {
  roomTypeDetected: RoomTypeEnum.BEDROOM,
  roomTypeConfidence: 0.1,
  roomTypeSource: 'VISION_MODEL',
  detectedObjects: [],
  qualityAssessment: {
    isClear: true,
    lighting: 'GOOD',
    isBlurry: false,
    isArchitecturalSpace: false,
    score: 0.2,
    usable: false,
    issues: ['NON_ARCHITECTURAL_SPACE'],
  },
  observations: ['Photograph depicts an outdoor nature landscape.'],
  rawModelName: 'gemini-3.5-flash',
};

export const EMPTY_ROOM_FIXTURE: VisionAnalysisResult = {
  roomTypeDetected: RoomTypeEnum.BEDROOM,
  roomTypeConfidence: 0.8,
  roomTypeSource: 'VISION_MODEL',
  detectedObjects: [],
  qualityAssessment: {
    isClear: true,
    lighting: 'GOOD',
    isBlurry: false,
    isArchitecturalSpace: true,
    score: 0.85,
    usable: true,
    issues: [],
  },
  observations: ['Empty room with freshly painted walls and bare floor.'],
  rawModelName: 'gemini-3.5-flash',
};

export const LOW_CONFIDENCE_DETECTIONS_FIXTURE: VisionAnalysisResult = {
  roomTypeDetected: RoomTypeEnum.BEDROOM,
  roomTypeConfidence: 0.7,
  roomTypeSource: 'VISION_MODEL',
  detectedObjects: [
    {
      objectType: 'bed',
      label: 'Probable Bed Frame',
      zone: DirectionEnum.SOUTH,
      relativePosition: { x: 0.5, y: 0.5 },
      confidence: 0.25, // Below CONFIDENCE_LOW (0.3)
      detectionStatus: 'UNCERTAIN',
      attributes: {},
    },
    {
      objectType: 'wardrobe',
      label: 'Solid Wood Wardrobe',
      zone: DirectionEnum.SOUTH_WEST,
      relativePosition: { x: 0.2, y: 0.4 },
      confidence: 0.85, // Above CONFIDENCE_LOW
      detectionStatus: 'DETECTED',
      attributes: {},
    },
  ],
  qualityAssessment: {
    isClear: true,
    lighting: 'MODERATE',
    isBlurry: false,
    isArchitecturalSpace: true,
    score: 0.75,
    usable: true,
    issues: [],
  },
  observations: ['Partial obstruction near bed area.'],
  rawModelName: 'gemini-3.5-flash',
};
