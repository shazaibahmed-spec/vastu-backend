import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AnalysisNotFoundException } from '../../../src/common/exceptions/domain.exception.js';
import { ReportsService } from '../../../src/modules/reports/reports.service.js';
import {
  DirectionEnum,
  RoomTypeEnum,
  ScoreBandEnum,
} from '../../../src/common/constants/index.js';

describe('ReportsService', () => {
  let reportsService: ReportsService;
  let mockAnalysisService: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {};
    mockAnalysisService = {
      getAnalysisById: vi.fn(),
    };
    reportsService = new ReportsService(mockPrisma, mockAnalysisService);
  });

  it('should throw AnalysisNotFoundException when analysis does not exist', async () => {
    mockAnalysisService.getAnalysisById.mockResolvedValue(null);

    await expect(
      reportsService.generateAnalysisPdf('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(AnalysisNotFoundException);
  });

  it('should generate a valid PDF buffer starting with %PDF- for a valid analysis', async () => {
    const mockAnalysisDto = {
      id: 'c8f5f0b4-7b9c-497f-94d5-5d93375be26e',
      roomType: RoomTypeEnum.BEDROOM,
      status: 'COMPLETED',
      overallScore: 82,
      scoreBand: ScoreBandEnum.EXCELLENT,
      orientation: {
        source: 'DEVICE_COMPASS',
        heading: 45.0,
        direction: DirectionEnum.NORTH_EAST,
        isCalibrated: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elementalBalance: {
        earth: 'Balanced',
        water: 'Dominant and pure',
        fire: 'Mild deficit',
        air: 'Harmonious',
        space: 'Unobstructed',
      },
      findings: [
        {
          ruleCode: 'BED-001',
          title: 'Bed Orientation',
          category: 'BEDROOM',
          verdict: 'COMPLIANT',
          severity: 'HIGH',
          description: 'Headboard aligned with South brings grounding restorative energy.',
          remedies: [
            {
              type: 'DECORATIVE',
              action: 'Maintain current orientation for long-term health and stability.',
            },
          ],
        },
        {
          ruleCode: 'BED-002',
          ruleName: 'Mirror Reflection',
          verdict: 'DEFECT',
          severity: 'MEDIUM',
          zone: DirectionEnum.NORTH,
          description: 'Mirror directly reflecting the bed creates energetic restlessness.',
          remedies: [
            {
              type: 'ELEMENTAL',
              action: 'Cover mirror with a neutral cotton cloth during sleep hours.',
            },
          ],
        },
      ],
      detectedObjects: [
        {
          label: 'Master Bed',
          zone: DirectionEnum.SOUTH,
          confidence: 0.95,
        },
      ],
    };

    mockAnalysisService.getAnalysisById.mockResolvedValue(mockAnalysisDto);

    const pdfBuffer = await reportsService.generateAnalysisPdf(
      'c8f5f0b4-7b9c-497f-94d5-5d93375be26e',
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    // Standard PDF header check
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});
