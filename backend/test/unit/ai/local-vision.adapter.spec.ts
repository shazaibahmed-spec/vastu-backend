import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { DirectionEnum, RoomTypeEnum } from '../../../src/common/constants/index.js';
import { LocalVisionAdapter } from '../../../src/modules/ai/adapters/local-vision.adapter.js';
import { AiProviderException } from '../../../src/common/exceptions/domain.exception.js';

describe('LocalVisionAdapter Unit Tests', () => {
  let adapter: LocalVisionAdapter;
  let mockConfigService: Partial<ConfigService>;
  let testImageBuffer: Buffer;

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        const map: Record<string, unknown> = {
          'ai.localVision.url': 'http://127.0.0.1:8000',
          'ai.localVision.model': 'yolov8n.pt',
          'ai.localVision.confidenceThreshold': 0.5,
          'ai.localVision.imageSize': 640,
          'ai.localVision.device': 'auto',
          'ai.localVision.timeoutMs': 5000,
        };
        return map[key];
      }),
    };

    adapter = new LocalVisionAdapter(mockConfigService as ConfigService);

    // Create a real 100x100 PNG buffer for testing Sharp operations
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .png()
      .toBuffer();
  });

  it('should successfully analyze an image and map YOLO detections to Vastu objects', async () => {
    const mockApiResponse = {
      success: true,
      model: 'yolov8n.pt',
      device: 'cpu',
      inference_duration_ms: 18.2,
      image_dimensions: { width: 640, height: 480 },
      detections: [
        {
          class_name: 'bed',
          confidence: 0.94,
          box: { x: 0.1, y: 0.3, width: 0.5, height: 0.4 },
          center: { x: 0.35, y: 0.5 },
        },
        {
          class_name: 'couch',
          confidence: 0.88,
          box: { x: 0.6, y: 0.3, width: 0.3, height: 0.3 },
          center: { x: 0.75, y: 0.45 },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as unknown as Response);

    const result = await adapter.analyzeImage({
      imageBuffer: testImageBuffer,
      mimeType: 'image/jpeg',
      roomType: RoomTypeEnum.BEDROOM,
      headingDegrees: 180,
      calibratedDirection: DirectionEnum.SOUTH,
    });

    expect(result).toBeDefined();
    expect(result.rawModelName).toBe('yolov8n.pt');
    expect(result.processingMetadata?.provider).toBe('local');
    expect(result.roomTypeDetected).toBe(RoomTypeEnum.BEDROOM);
    expect(result.detectedObjects).toHaveLength(2);

    // Verify bed detection
    const bed = result.detectedObjects.find((o) => o.objectType === 'bed');
    expect(bed).toBeDefined();
    expect(bed?.label).toBe('Bed');
    expect(bed?.confidence).toBe(0.94);
    expect(bed?.boundingBox?.x).toBe(0.1);
    expect(bed?.detectionStatus).toBe('DETECTED');

    // Verify sofa detection (mapped from couch)
    const sofa = result.detectedObjects.find((o) => o.objectType === 'sofa');
    expect(sofa).toBeDefined();
    expect(sofa?.label).toBe('Sofa');
    expect(sofa?.confidence).toBe(0.88);
  });

  it('should infer room type heuristically when dominant items are detected', async () => {
    const mockApiResponse = {
      success: true,
      model: 'yolov8n.pt',
      device: 'cpu',
      inference_duration_ms: 15.0,
      detections: [
        {
          class_name: 'oven',
          confidence: 0.92,
          box: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
          center: { x: 0.35, y: 0.35 },
        },
        {
          class_name: 'sink',
          confidence: 0.89,
          box: { x: 0.6, y: 0.2, width: 0.3, height: 0.3 },
          center: { x: 0.75, y: 0.35 },
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as unknown as Response);

    const result = await adapter.analyzeImage({
      imageBuffer: testImageBuffer,
      mimeType: 'image/jpeg',
      roomType: RoomTypeEnum.LIVING_ROOM, // User said living room, but stove & sink present
      headingDegrees: 90,
      calibratedDirection: DirectionEnum.EAST,
    });

    expect(result.roomTypeDetected).toBe(RoomTypeEnum.KITCHEN);
    expect(result.roomTypeSource).toBe('VISION_MODEL');
  });

  it('should throw AiProviderException if local inference service returns HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Model service unavailable',
    } as unknown as Response);

    await expect(
      adapter.analyzeImage({
        imageBuffer: testImageBuffer,
        mimeType: 'image/jpeg',
        roomType: RoomTypeEnum.BEDROOM,
      }),
    ).rejects.toThrow(AiProviderException);
  });

  it('should throw AiProviderException if fetch encounters a network or connection error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('ECONNREFUSED: Connection refused at 127.0.0.1:8000'),
    );

    await expect(
      adapter.analyzeImage({
        imageBuffer: testImageBuffer,
        mimeType: 'image/jpeg',
        roomType: RoomTypeEnum.BEDROOM,
      }),
    ).rejects.toThrow(AiProviderException);
  });
});
