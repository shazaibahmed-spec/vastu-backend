import { describe, expect, it } from 'vitest';
import {
  DirectionEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../src/common/constants/index.js';
import { MockLlmAdapter } from '../../../src/modules/ai/adapters/mock-llm.adapter.js';
import { MockVisionAdapter } from '../../../src/modules/ai/adapters/mock-vision.adapter.js';

describe('Mock AI Adapters Unit Tests', () => {
  const visionAdapter = new MockVisionAdapter();
  const llmAdapter = new MockLlmAdapter();

  describe('MockVisionAdapter', () => {
    it('should generate valid vision detection for Bedroom', async () => {
      const result = await visionAdapter.analyzeImage({
        imageBuffer: Buffer.from('mock_image_bytes'),
        mimeType: 'image/webp',
        roomType: RoomTypeEnum.BEDROOM,
        headingDegrees: 180,
        calibratedDirection: DirectionEnum.SOUTH,
      });

      expect(result.roomTypeDetected).toBe(RoomTypeEnum.BEDROOM);
      expect(result.roomTypeConfidence).toBeGreaterThanOrEqual(0.9);
      expect(result.roomTypeSource).toBe('VISION_MODEL');
      expect(result.detectedObjects.length).toBeGreaterThan(0);
      const bed = result.detectedObjects.find((o) => o.objectType === 'bed');
      expect(bed).toBeDefined();
      expect(bed?.confidence).toBeGreaterThanOrEqual(0.9);
      expect(bed?.detectionStatus).toBe('DETECTED');
      expect(result.qualityAssessment.isClear).toBe(true);
      expect(result.qualityAssessment.score).toBeGreaterThanOrEqual(0.8);
      expect(result.processingMetadata?.modelName).toBeDefined();
      expect(result.processingMetadata?.promptVersion).toBeDefined();
    });

    it('should allow overriding results with custom edge-case fixtures', async () => {
      visionAdapter.setCustomFixture(MockVisionAdapter.poorQualityFixture());

      const result = await visionAdapter.analyzeImage({
        imageBuffer: Buffer.from('mock_image_bytes'),
        mimeType: 'image/webp',
        roomType: RoomTypeEnum.BEDROOM,
        headingDegrees: 180,
      });

      expect(result.qualityAssessment.usable).toBe(false);
      expect(result.qualityAssessment.isClear).toBe(false);
      expect(result.qualityAssessment.issues).toContain('TOO_DARK');

      // Reset
      visionAdapter.setCustomFixture(undefined);
    });

    it('should generate valid vision detection for Kitchen', async () => {
      const result = await visionAdapter.analyzeImage({
        imageBuffer: Buffer.from('mock_image_bytes'),
        mimeType: 'image/webp',
        roomType: RoomTypeEnum.KITCHEN,
        headingDegrees: 135,
        calibratedDirection: DirectionEnum.SOUTH_EAST,
      });

      expect(result.roomTypeDetected).toBe(RoomTypeEnum.KITCHEN);
      const stove = result.detectedObjects.find((o) => o.objectType === 'gas_stove');
      expect(stove).toBeDefined();
      expect(stove?.zone).toBe(DirectionEnum.SOUTH_EAST);
    });

    it('should generate valid vision detection for Main Entrance', async () => {
      const result = await visionAdapter.analyzeImage({
        imageBuffer: Buffer.from('mock_image_bytes'),
        mimeType: 'image/webp',
        roomType: RoomTypeEnum.MAIN_ENTRANCE,
        headingDegrees: 45,
        calibratedDirection: DirectionEnum.NORTH_EAST,
      });

      expect(result.roomTypeDetected).toBe(RoomTypeEnum.MAIN_ENTRANCE);
      const door = result.detectedObjects.find((o) => o.objectType === 'entrance_door');
      expect(door).toBeDefined();
    });

    it('should generate realistic defects for North-facing Bedroom', async () => {
      const result = await visionAdapter.analyzeImage({
        imageBuffer: Buffer.from('mock_image_bytes'),
        mimeType: 'image/webp',
        roomType: RoomTypeEnum.BEDROOM,
        headingDegrees: 0,
        calibratedDirection: DirectionEnum.NORTH,
      });

      const bed = result.detectedObjects.find((o) => o.objectType === 'bed');
      const mirror = result.detectedObjects.find((o) => o.objectType === 'mirror');
      expect(bed).toBeDefined();
      expect(bed?.attributes.headboardDirection).toBe(DirectionEnum.NORTH);
      expect(mirror?.attributes.reflectsBed).toBe(true);
    });

    it('should generate fire-water clash defects for North-East Kitchen', async () => {
      const result = await visionAdapter.analyzeImage({
        imageBuffer: Buffer.from('mock_image_bytes'),
        mimeType: 'image/webp',
        roomType: RoomTypeEnum.KITCHEN,
        headingDegrees: 45,
        calibratedDirection: DirectionEnum.NORTH_EAST,
      });

      const stove = result.detectedObjects.find((o) => o.objectType === 'gas_stove');
      const sink = result.detectedObjects.find((o) => o.objectType === 'sink');
      expect(stove?.zone).toBe(DirectionEnum.NORTH_EAST);
      expect(sink?.zone).toBe(DirectionEnum.NORTH_EAST);
    });
  });

  describe('MockLlmAdapter', () => {
    it('should synthesize empathetic explanation and remedies for findings', async () => {
      const result = await llmAdapter.generateExplanation({
        roomType: RoomTypeEnum.BEDROOM,
        overallScore: 75,
        scoreBand: 'GOOD',
        findings: [
          {
            ruleCode: 'BED-001-POS-SW',
            category: 'PLACEMENT',
            verdict: VerdictEnum.COMPLIANT,
            severity: SeverityEnum.LOW,
            targetObject: 'bed',
            zone: DirectionEnum.SOUTH_WEST,
            canonicalDescription: 'Bed is situated in South-West stability quadrant.',
            defaultRemedyText: 'Maintain current placement.',
          },
          {
            ruleCode: 'BED-005-MIRROR-BED-REFLECTION',
            category: 'OBSTRUCTION',
            verdict: VerdictEnum.DEFECT,
            severity: SeverityEnum.HIGH,
            targetObject: 'mirror',
            zone: DirectionEnum.NORTH,
            canonicalDescription: 'Mirror directly reflects bed during sleep.',
            defaultRemedyText: 'Cover mirror during sleeping hours.',
          },
        ],
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(20);
      expect(result.findingExplanations.length).toBe(2);

      const mirrorExplanation = result.findingExplanations.find(
        (e) => e.ruleCode === 'BED-005-MIRROR-BED-REFLECTION',
      );
      expect(mirrorExplanation).toBeDefined();
      expect(mirrorExplanation?.actionableRemedy).toContain('Cover mirror');
      expect(mirrorExplanation?.remedyType).toBe(RemedyTypeEnum.ELEMENTAL);
    });
  });
});
