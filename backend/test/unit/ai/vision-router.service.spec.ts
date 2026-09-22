import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { RoomTypeEnum, DirectionEnum } from '../../../src/common/constants/index.js';
import { VisionRouterService } from '../../../src/modules/ai/services/vision-router.service.js';
import { MockVisionAdapter } from '../../../src/modules/ai/adapters/mock-vision.adapter.js';
import { GeminiVisionAdapter } from '../../../src/modules/ai/adapters/gemini-vision.adapter.js';
import { OpenAiVisionAdapter } from '../../../src/modules/ai/adapters/openai-vision.adapter.js';
import { LocalVisionAdapter } from '../../../src/modules/ai/adapters/local-vision.adapter.js';
import { AiProviderException } from '../../../src/common/exceptions/domain.exception.js';

describe('VisionRouterService Unit Tests', () => {
  let router: VisionRouterService;
  let mockConfigService: Partial<ConfigService>;
  let mockVision: MockVisionAdapter;
  let mockOpenAiVision: Partial<OpenAiVisionAdapter>;
  let mockGeminiVision: Partial<GeminiVisionAdapter>;
  let mockLocalVision: Partial<LocalVisionAdapter>;

  let configMap: Record<string, unknown>;

  beforeEach(() => {
    configMap = {
      'ai.visionProvider': 'existing',
      'ai.existingVisionProvider': 'mock',
      'ai.visionFallbackEnabled': false,
      'ai.visionFallbackProvider': 'existing',
    };

    mockConfigService = {
      get: vi.fn((key: string) => configMap[key]),
    };

    mockVision = new MockVisionAdapter();
    mockOpenAiVision = {
      analyzeImage: vi.fn(),
    };
    mockGeminiVision = {
      analyzeImage: vi.fn(),
    };
    mockLocalVision = {
      analyzeImage: vi.fn(),
    };

    router = new VisionRouterService(
      mockConfigService as ConfigService,
      mockVision,
      mockOpenAiVision as OpenAiVisionAdapter,
      mockGeminiVision as GeminiVisionAdapter,
      mockLocalVision as LocalVisionAdapter,
    );
  });

  describe('Provider Resolution', () => {
    it('should resolve LocalVisionAdapter when VISION_PROVIDER=local', () => {
      configMap['ai.visionProvider'] = 'local';
      const resolved = router.resolveProvider();
      expect(resolved.name).toBe('local');
      expect(resolved.provider).toBe(mockLocalVision);
    });

    it('should resolve MockVisionAdapter when VISION_PROVIDER=existing and EXISTING_VISION_PROVIDER=mock', () => {
      configMap['ai.visionProvider'] = 'existing';
      configMap['ai.existingVisionProvider'] = 'mock';
      const resolved = router.resolveProvider();
      expect(resolved.name).toBe('existing(mock)');
      expect(resolved.provider).toBe(mockVision);
    });

    it('should resolve GeminiVisionAdapter when VISION_PROVIDER=existing and EXISTING_VISION_PROVIDER=gemini', () => {
      configMap['ai.visionProvider'] = 'existing';
      configMap['ai.existingVisionProvider'] = 'gemini';
      const resolved = router.resolveProvider();
      expect(resolved.name).toBe('existing(gemini)');
      expect(resolved.provider).toBe(mockGeminiVision);
    });

    it('should resolve OpenAiVisionAdapter when VISION_PROVIDER=openai directly', () => {
      configMap['ai.visionProvider'] = 'openai';
      const resolved = router.resolveProvider();
      expect(resolved.name).toBe('openai');
      expect(resolved.provider).toBe(mockOpenAiVision);
    });
  });

  describe('Execution & Fallback', () => {
    const testInput = {
      imageBuffer: Buffer.from('test_image'),
      mimeType: 'image/jpeg',
      roomType: RoomTypeEnum.BEDROOM,
      headingDegrees: 180,
      calibratedDirection: DirectionEnum.SOUTH,
    };

    it('should route analyzeImage to the active provider and return result', async () => {
      configMap['ai.visionProvider'] = 'existing';
      configMap['ai.existingVisionProvider'] = 'mock';

      const result = await router.analyzeImage(testInput);
      expect(result).toBeDefined();
      expect(result.roomTypeDetected).toBe(RoomTypeEnum.BEDROOM);
      expect(result.detectedObjects.length).toBeGreaterThan(0);
    });

    it('should throw immediately when primary provider fails and fallback is disabled', async () => {
      configMap['ai.visionProvider'] = 'local';
      configMap['ai.visionFallbackEnabled'] = false;

      (mockLocalVision.analyzeImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AiProviderException('LocalVision', 'Service offline'),
      );

      await expect(router.analyzeImage(testInput)).rejects.toThrow(AiProviderException);
    });

    it('should fallback to secondary provider when primary fails and fallback is enabled', async () => {
      configMap['ai.visionProvider'] = 'local';
      configMap['ai.visionFallbackEnabled'] = true;
      configMap['ai.visionFallbackProvider'] = 'existing';
      configMap['ai.existingVisionProvider'] = 'mock';

      // Primary fails
      (mockLocalVision.analyzeImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AiProviderException('LocalVision', 'Inference service timeout'),
      );

      const result = await router.analyzeImage(testInput);

      expect(result).toBeDefined();
      // Should have successfully fallen back to MockVisionAdapter
      expect(result.roomTypeDetected).toBe(RoomTypeEnum.BEDROOM);
      expect(result.rawModelName).toContain('mock');
    });

    it('should rethrow error if both primary and fallback fail', async () => {
      configMap['ai.visionProvider'] = 'local';
      configMap['ai.visionFallbackEnabled'] = true;
      configMap['ai.visionFallbackProvider'] = 'gemini';

      (mockLocalVision.analyzeImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AiProviderException('LocalVision', 'Local model crashed'),
      );
      (mockGeminiVision.analyzeImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AiProviderException('Gemini', 'API key invalid'),
      );

      await expect(router.analyzeImage(testInput)).rejects.toThrow(
        'API key invalid',
      );
    });
  });
});
