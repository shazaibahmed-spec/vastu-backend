import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DirectionEnum,
  DirectionSourceEnum,
  RoomTypeEnum,
} from '../../../src/common/constants/index.js';
import {
  InvalidDirectionException,
} from '../../../src/common/exceptions/domain.exception.js';
import { AnalysisService } from '../../../src/modules/analysis/services/analysis.service.js';
import { VastuRulesEngine } from '../../../src/modules/vastu/engine/vastu-rules-engine.js';

describe('AnalysisService Unit Tests', () => {
  let service: AnalysisService;
  let mockPrisma: any;
  let mockVastuEngine: any;

  beforeEach(() => {
    mockPrisma = {
      vastuRuleVersion: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      analysis: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      analysisInput: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (callback) => callback(mockPrisma)),
    };

    mockVastuEngine = new VastuRulesEngine();
    service = new AnalysisService(mockPrisma, mockVastuEngine);
  });

  describe('resolveDirection', () => {
    it('should resolve DEVICE_COMPASS heading to correct direction', () => {
      const result = service.resolveDirection({
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        compassHeading: 180,
      });

      expect(result.isCalibrated).toBe(true);
      expect(result.heading).toBe(180);
      expect(result.direction).toBe(DirectionEnum.SOUTH);
    });

    it('should throw InvalidDirectionException when DEVICE_COMPASS lacks compassHeading', () => {
      expect(() => {
        service.resolveDirection({
          roomType: RoomTypeEnum.BEDROOM,
          directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        });
      }).toThrow(InvalidDirectionException);
    });

    it('should resolve USER_SELECTED direction directly', () => {
      const result = service.resolveDirection({
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.USER_SELECTED,
        userSelectedDirection: DirectionEnum.NORTH_EAST,
      });

      expect(result.isCalibrated).toBe(true);
      expect(result.direction).toBe(DirectionEnum.NORTH_EAST);
    });

    it('should return uncalibrated for UNKNOWN source', () => {
      const result = service.resolveDirection({
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.UNKNOWN,
      });

      expect(result.isCalibrated).toBe(false);
      expect(result.direction).toBeUndefined();
    });
  });

  describe('createAnalysisIntent', () => {
    it('should create analysis aggregate and input within a transaction', async () => {
      mockPrisma.vastuRuleVersion.findFirst.mockResolvedValue({
        id: 'rule_v1_uuid',
        versionNumber: '1.0.0',
      });

      mockPrisma.analysis.create.mockResolvedValue({
        id: 'analysis_uuid',
        userId: 'user_uuid',
        ruleVersionId: 'rule_v1_uuid',
        roomType: 'BEDROOM',
        status: 'PENDING',
        compassHeading: 180,
        directionSource: 'DEVICE_COMPASS',
        confirmedDirection: 'SOUTH',
      });

      mockPrisma.analysisInput.create.mockResolvedValue({
        id: 'input_uuid',
      });

      const analysisId = await service.createAnalysisIntent('user_uuid', {
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        compassHeading: 180,
        notes: 'Testing bedroom intent creation',
      });

      expect(analysisId).toBe('analysis_uuid');
      expect(mockPrisma.analysis.create).toHaveBeenCalled();
      expect(mockPrisma.analysisInput.create).toHaveBeenCalled();
    });
  });

  describe('getAnalysisById', () => {
    it('should retrieve a guest analysis for an authenticated user and auto-claim it', async () => {
      const mockRecord = {
        id: '291433f5-54b4-4015-9112-9e7e72ea07ce',
        userId: '00000000-0000-0000-0000-000000000001',
        roomType: 'BEDROOM',
        status: 'COMPLETED',
        directionSource: 'USER_SELECTED',
        confirmedDirection: 'NORTH',
        overallScore: 85,
        image: null,
        detectedObjects: [],
        findings: [],
        report: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.analysis.findFirst.mockResolvedValue(mockRecord);
      mockPrisma.analysis.update.mockResolvedValue({
        ...mockRecord,
        userId: 'auth_user_123',
      });

      const result = await service.getAnalysisById(
        '291433f5-54b4-4015-9112-9e7e72ea07ce',
        'auth_user_123',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('291433f5-54b4-4015-9112-9e7e72ea07ce');
      expect(mockPrisma.analysis.update).toHaveBeenCalledWith({
        where: { id: '291433f5-54b4-4015-9112-9e7e72ea07ce' },
        data: { userId: 'auth_user_123' },
      });
    });

    it('should correctly format detectedObjects with normalized boundingBox and type', async () => {
      const mockRecord = {
        id: '291433f5-54b4-4015-9112-9e7e72ea07ce',
        userId: 'auth_user_123',
        roomType: 'BEDROOM',
        status: 'COMPLETED',
        directionSource: 'USER_SELECTED',
        confirmedDirection: 'SOUTH',
        overallScore: 92,
        image: {
          storageKey: 'analyses/photo1.webp',
          width: 1920,
          height: 1080,
        },
        detectedObjects: [
          {
            id: 'obj-bed-1',
            objectType: 'bed',
            label: 'Bed',
            zone: 'SOUTH',
            relativePosition: { x: 0.5, y: 0.6 },
            confidence: 0.94,
            boundingBox: { x: 0.12, y: 0.35, width: 0.5, height: 0.3 },
            detectionStatus: 'VERIFIED',
            attributes: { headboardOrientation: 'SOUTH' },
          },
        ],
        findings: [],
        report: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.analysis.findFirst.mockResolvedValue(mockRecord);

      const result = await service.getAnalysisById(
        '291433f5-54b4-4015-9112-9e7e72ea07ce',
        'auth_user_123',
      );

      expect(result.image?.url).toBe('/storage/analyses/photo1.webp');
      expect(result.detectedObjects).toHaveLength(1);
      expect(result.detectedObjects[0]).toEqual({
        id: 'obj-bed-1',
        type: 'bed',
        objectType: 'bed',
        label: 'Bed',
        zone: 'SOUTH',
        relativePosition: { x: 0.5, y: 0.6 },
        confidence: 0.94,
        boundingBox: { x: 0.12, y: 0.35, width: 0.5, height: 0.3 },
        detectionStatus: 'VERIFIED',
        attributes: { headboardOrientation: 'SOUTH' },
      });
    });

    it('should throw AnalysisNotFoundException when analysis does not exist', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue(null);

      await expect(
        service.getAnalysisById('non_existent_id', 'auth_user_123'),
      ).rejects.toThrow();
    });
  });
});

