import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnalysisStatusEnum,
  DirectionEnum,
  DirectionSourceEnum,
  RoomTypeEnum,
} from '../../../src/common/constants/index.js';
import { MockLlmAdapter } from '../../../src/modules/ai/adapters/mock-llm.adapter.js';
import { MockVisionAdapter } from '../../../src/modules/ai/adapters/mock-vision.adapter.js';
import { AnalysisPipelineService } from '../../../src/modules/analysis/services/analysis-pipeline.service.js';
import { AnalysisService } from '../../../src/modules/analysis/services/analysis.service.js';
import { VastuRulesEngine } from '../../../src/modules/vastu/engine/vastu-rules-engine.js';

describe('AnalysisPipelineService Integration Test', () => {
  let pipelineService: AnalysisPipelineService;
  let analysisService: AnalysisService;
  let mockPrisma: any;
  let mockStorageService: any;
  let vastuEngine: VastuRulesEngine;
  let visionAdapter: MockVisionAdapter;
  let llmAdapter: MockLlmAdapter;

  beforeEach(() => {
    mockPrisma = {
      vastuRuleVersion: {
        findFirst: vi.fn().mockResolvedValue({ id: 'rule_v1_uuid', versionNumber: '1.0.0' }),
      },
      analysis: {
        create: vi.fn().mockResolvedValue({
          id: 'anl_test_123',
          userId: 'user_123',
          ruleVersionId: 'rule_v1_uuid',
          roomType: 'BEDROOM',
          status: 'PENDING',
          compassHeading: 180,
          directionSource: 'DEVICE_COMPASS',
          confirmedDirection: 'SOUTH',
        }),
        findUnique: vi.fn().mockResolvedValue({ status: 'PENDING' }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'anl_test_123',
          status: 'COMPLETED',
          roomType: 'BEDROOM',
          directionSource: 'DEVICE_COMPASS',
          compassHeading: 180,
          confirmedDirection: 'SOUTH',
          overallScore: 100,
          image: { storageKey: 'test.webp', width: 640, height: 480 },
          detectedObjects: [
            {
              id: 'obj_1',
              objectType: 'bed',
              label: 'Double Bed',
              zone: 'SOUTH_WEST',
              relativePosition: { x: 0.5, y: 0.5 },
              confidence: 0.95,
              attributesJson: { headboardDirection: 'SOUTH' },
            },
          ],
          findings: [
            {
              id: 'fnd_1',
              ruleId: 'BED-001-POS-SW',
              verdict: 'COMPLIANT',
              severity: 'LOW',
              rawReason: 'Bed is placed in South-West stability zone.',
              remedies: [],
            },
          ],
          report: {
            summary: 'Your bedroom is well aligned.',
            elementalBalanceJson: { earth: 'BALANCED' },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      analysisInput: {
        create: vi.fn().mockResolvedValue({}),
      },
      analysisImage: {
        findFirst: vi.fn().mockResolvedValue(null), // no duplicate
        create: vi.fn().mockResolvedValue({}),
      },
      detectedObject: {
        create: vi.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'obj_1',
            ...args.data,
          }),
        ),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ languageCode: 'en' }),
      },
      analysisFinding: {
        findFirst: vi.fn().mockResolvedValue({ id: 'fnd_1' }),
        create: vi.fn().mockResolvedValue({ id: 'fnd_1' }),
        update: vi.fn().mockResolvedValue({ id: 'fnd_1' }),
      },
      vastuRule: {
        findFirst: vi.fn().mockResolvedValue({ id: 'rule_bed_01' }),
      },
      remedy: {
        create: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      analysisReport: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    vastuEngine = new VastuRulesEngine();
    analysisService = new AnalysisService(mockPrisma, vastuEngine);

    mockStorageService = {
      processAndStoreImage: vi.fn().mockResolvedValue({
        uploadResult: { storageKey: 'uploads/anl_test_123.webp', url: '/uploads/test.webp', sizeBytes: 50000 },
        processedImage: {
          processedBuffer: Buffer.from('processed_webp_data'),
          mimeType: 'image/webp',
          extension: 'webp',
          width: 800,
          height: 600,
          sizeBytes: 50000,
          sha256Hash: 'abc123hash',
        },
      }),
    };

    visionAdapter = new MockVisionAdapter();
    llmAdapter = new MockLlmAdapter();

    pipelineService = new AnalysisPipelineService(
      mockPrisma,
      analysisService,
      mockStorageService,
      vastuEngine,
      visionAdapter,
      llmAdapter,
    );
  });

  it('should run end-to-end analysis pipeline and return complete report', async () => {
    // Stub state transitions to succeed in mock DB
    vi.spyOn(analysisService, 'transitionState').mockResolvedValue(undefined);

    const testImageBuffer = Buffer.from('fake_image_bytes_for_pipeline_test');

    const result = await pipelineService.executePipeline(
      'user_123',
      testImageBuffer,
      'test-bedroom.jpg',
      {
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        compassHeading: 180,
        notes: 'Master suite on upper floor',
      },
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('anl_test_123');
    expect(result.status).toBe(AnalysisStatusEnum.COMPLETED);
    expect(result.overallScore).toBe(100);
    expect(result.detectedObjects.length).toBeGreaterThan(0);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.aiSummary).toBeDefined();

    // Verify all phases were invoked
    expect(mockStorageService.processAndStoreImage).toHaveBeenCalled();
    expect(mockPrisma.detectedObject.create).toHaveBeenCalled();
    expect(mockPrisma.analysisReport.create).toHaveBeenCalled();
    expect(analysisService.transitionState).toHaveBeenCalledWith(
      'anl_test_123',
      AnalysisStatusEnum.COMPLETED,
    );
  });

  it('should reject pipeline execution early if image quality is insufficient', async () => {
    mockStorageService.assessImageQuality = vi.fn().mockResolvedValue({
      usable: false,
      score: 0.1,
      issues: ['RESOLUTION_TOO_LOW', 'TOO_DARK'],
    });

    const testBuffer = Buffer.from('too_small_dark_image');

    await expect(
      pipelineService.executePipeline('user_123', testBuffer, 'bad.jpg', {
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        compassHeading: 180,
      }),
    ).rejects.toThrowError(/Image quality insufficient/);

    // Verify it did not proceed to store image or call AI
    expect(mockStorageService.processAndStoreImage).not.toHaveBeenCalled();
  });

  it('should persist bounding boxes and detection status on detected objects', async () => {
    vi.spyOn(analysisService, 'transitionState').mockResolvedValue(undefined);
    mockStorageService.assessImageQuality = vi.fn().mockResolvedValue({
      usable: true,
      score: 0.9,
      issues: [],
    });

    visionAdapter.setCustomFixture({
      detectedObjects: [
        {
          objectType: 'bed',
          label: 'Master Bed',
          zone: DirectionEnum.SOUTH,
          relativePosition: { x: 0.5, y: 0.5 },
          confidence: 0.92,
          detectionStatus: 'DETECTED',
          boundingBox: { x: 0.2, y: 0.3, width: 0.5, height: 0.4 },
          attributes: { headboardOrientation: 'SOUTH' },
        },
      ],
    });

    await pipelineService.executePipeline(
      'user_123',
      Buffer.from('valid_image_bytes'),
      'bed.jpg',
      {
        roomType: RoomTypeEnum.BEDROOM,
        directionSource: DirectionSourceEnum.DEVICE_COMPASS,
        compassHeading: 180,
      },
    );

    expect(mockPrisma.detectedObject.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          boundingBox: { x: 0.2, y: 0.3, width: 0.5, height: 0.4 },
          detectionStatus: 'DETECTED',
        }),
      }),
    );
  });
});
