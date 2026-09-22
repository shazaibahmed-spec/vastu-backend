import { describe, expect, it } from 'vitest';
import {
  DirectionEnum,
  RoomTypeEnum,
} from '../../../src/common/constants/index.js';
import { VisionAnalysisResultSchema } from '../../../src/modules/ai/schemas/vision-analysis.schema.js';
import {
  normalizeAndValidateVisionResult,
  normalizeConfidence,
  normalizeDirection,
  normalizeLighting,
  normalizePosition,
  normalizeRoomType,
} from '../../../src/modules/ai/utils/vision-normalization.util.js';
import {
  BEDROOM_FIXTURE,
  EMPTY_ROOM_FIXTURE,
  KITCHEN_FIXTURE,
  NON_ARCHITECTURAL_FIXTURE,
  POOR_QUALITY_FIXTURE,
} from './vision-fixtures.js';

describe('Vision Schema Validation & Normalization', () => {
  describe('VisionAnalysisResultSchema directly', () => {
    it('should validate complete standard fixtures without errors', () => {
      expect(() => VisionAnalysisResultSchema.parse(BEDROOM_FIXTURE)).not.toThrow();
      expect(() => VisionAnalysisResultSchema.parse(KITCHEN_FIXTURE)).not.toThrow();
      expect(() => VisionAnalysisResultSchema.parse(POOR_QUALITY_FIXTURE)).not.toThrow();
      expect(() => VisionAnalysisResultSchema.parse(NON_ARCHITECTURAL_FIXTURE)).not.toThrow();
      expect(() => VisionAnalysisResultSchema.parse(EMPTY_ROOM_FIXTURE)).not.toThrow();
    });

    it('should accept minimal valid objects with default values', () => {
      const minimal = {
        roomTypeDetected: RoomTypeEnum.BEDROOM,
        detectedObjects: [],
        qualityAssessment: {
          isClear: true,
          lighting: 'GOOD' as const,
        },
      };

      const parsed = VisionAnalysisResultSchema.parse(minimal);
      expect(parsed.roomTypeConfidence).toBe(0.85);
      expect(parsed.roomTypeSource).toBe('VISION_MODEL');
      expect(parsed.qualityAssessment.isBlurry).toBe(false);
      expect(parsed.qualityAssessment.isArchitecturalSpace).toBe(true);
      expect(parsed.qualityAssessment.usable).toBe(true);
    });
  });

  describe('normalizeRoomType', () => {
    it('should map various room string representations correctly', () => {
      expect(normalizeRoomType('master bedroom', RoomTypeEnum.BEDROOM)).toBe(
        RoomTypeEnum.BEDROOM,
      );
      expect(normalizeRoomType('kitchenette', RoomTypeEnum.BEDROOM)).toBe(
        RoomTypeEnum.KITCHEN,
      );
      expect(normalizeRoomType('living_room_area', RoomTypeEnum.BEDROOM)).toBe(
        RoomTypeEnum.LIVING_ROOM,
      );
      expect(normalizeRoomType('entrance foyer gate', RoomTypeEnum.BEDROOM)).toBe(
        RoomTypeEnum.MAIN_ENTRANCE,
      );
      expect(normalizeRoomType('home_office_study', RoomTypeEnum.BEDROOM)).toBe(
        RoomTypeEnum.OFFICE,
      );
    });

    it('should fall back to fallbackRoomType if input is unrecognized', () => {
      expect(normalizeRoomType('random_garage', RoomTypeEnum.BEDROOM)).toBe(
        RoomTypeEnum.BEDROOM,
      );
      expect(normalizeRoomType(null, RoomTypeEnum.KITCHEN)).toBe(
        RoomTypeEnum.KITCHEN,
      );
    });
  });

  describe('normalizeDirection', () => {
    it('should handle standard abbreviations and mixed cases', () => {
      expect(normalizeDirection('N')).toBe(DirectionEnum.NORTH);
      expect(normalizeDirection('north')).toBe(DirectionEnum.NORTH);
      expect(normalizeDirection('NE')).toBe(DirectionEnum.NORTH_EAST);
      expect(normalizeDirection('North_East')).toBe(DirectionEnum.NORTH_EAST);
      expect(normalizeDirection('E')).toBe(DirectionEnum.EAST);
      expect(normalizeDirection('SE')).toBe(DirectionEnum.SOUTH_EAST);
      expect(normalizeDirection('S')).toBe(DirectionEnum.SOUTH);
      expect(normalizeDirection('SW')).toBe(DirectionEnum.SOUTH_WEST);
      expect(normalizeDirection('W')).toBe(DirectionEnum.WEST);
      expect(normalizeDirection('NW')).toBe(DirectionEnum.NORTH_WEST);
      expect(normalizeDirection('Brahmasthan Center')).toBe(DirectionEnum.CENTER);
    });

    it('should fallback to NORTH on invalid string', () => {
      expect(normalizeDirection('invalid_direction')).toBe(DirectionEnum.NORTH);
    });
  });

  describe('normalizePosition & normalizeConfidence', () => {
    it('should convert percentage coordinates (> 1 and <= 100) to 0..1 decimals', () => {
      expect(normalizePosition({ x: 50, y: 75 })).toEqual({ x: 0.5, y: 0.75 });
      expect(normalizeConfidence(85)).toBe(0.85);
    });

    it('should clamp out-of-bounds coordinates', () => {
      expect(normalizePosition({ x: -0.2, y: 1.5 })).toEqual({ x: 0, y: 1 });
      expect(normalizeConfidence(-0.5)).toBe(0);
      expect(normalizeConfidence(1.5)).toBe(1);
    });
  });

  describe('normalizeLighting', () => {
    it('should normalize dimly lit environments to POOR', () => {
      expect(normalizeLighting('dim')).toBe('POOR');
      expect(normalizeLighting('dark and shadowy')).toBe('POOR');
      expect(normalizeLighting('moderate ambient')).toBe('MODERATE');
      expect(normalizeLighting('bright sunlight')).toBe('GOOD');
    });
  });

  describe('normalizeAndValidateVisionResult integration', () => {
    it('should successfully normalize raw AI JSON with quirky formats', () => {
      const rawAiResponse = {
        roomTypeDetected: 'master-bedroom',
        roomTypeConfidence: 94, // as percentage
        detectedObjects: [
          {
            objectType: 'BED',
            label: 'Teakwood Bed',
            zone: 'SW',
            relativePosition: { x: 45, y: 60 }, // percentage
            boundingBox: { x: 0.2, y: 0.3, width: 0.5, height: 0.4 },
            confidence: 92, // percentage
            attributes: {
              headboardOrientation: 'S',
            },
          },
        ],
        qualityAssessment: {
          isClear: true,
          lighting: 'well lit',
          score: 88,
        },
        observations: ['Bed along South wall'],
      };

      const normalized = normalizeAndValidateVisionResult(rawAiResponse, {
        fallbackRoomType: RoomTypeEnum.BEDROOM,
        modelName: 'test-model',
        durationMs: 950,
      });

      expect(normalized.roomTypeDetected).toBe(RoomTypeEnum.BEDROOM);
      expect(normalized.roomTypeConfidence).toBe(0.94);
      expect(normalized.detectedObjects).toHaveLength(1);
      expect(normalized.detectedObjects[0].objectType).toBe('bed');
      expect(normalized.detectedObjects[0].zone).toBe(DirectionEnum.SOUTH_WEST);
      expect(normalized.detectedObjects[0].relativePosition).toEqual({ x: 0.45, y: 0.6 });
      expect(normalized.detectedObjects[0].confidence).toBe(0.92);
      expect(normalized.detectedObjects[0].detectionStatus).toBe('DETECTED');
      expect(normalized.detectedObjects[0].attributes.headboardOrientation).toBe(DirectionEnum.SOUTH);
      expect(normalized.qualityAssessment.score).toBe(0.88);
      expect(normalized.processingMetadata?.processingDurationMs).toBe(950);
    });
  });
});
