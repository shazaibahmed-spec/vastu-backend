import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  VisionAnalysisInput,
  VisionAnalysisResult,
  VisionProvider,
} from '../interfaces/vision-provider.interface.js';
import { GeminiVisionAdapter } from '../adapters/gemini-vision.adapter.js';
import { MockVisionAdapter } from '../adapters/mock-vision.adapter.js';
import { OpenAiVisionAdapter } from '../adapters/openai-vision.adapter.js';
import { LocalVisionAdapter } from '../adapters/local-vision.adapter.js';

export type VisionProviderType = 'existing' | 'local' | 'gemini' | 'openai' | 'mock';

@Injectable()
export class VisionRouterService implements VisionProvider {
  private readonly logger = new Logger(VisionRouterService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mockVision: MockVisionAdapter,
    private readonly openAiVision: OpenAiVisionAdapter,
    private readonly geminiVision: GeminiVisionAdapter,
    private readonly localVision: LocalVisionAdapter,
  ) {}

  /**
   * Resolves the configured primary vision provider.
   */
  resolveProvider(providerName?: string): {
    name: string;
    provider: VisionProvider;
  } {
    const requested = (
      providerName ||
      this.configService.get<string>('ai.visionProvider') ||
      'existing'
    ).toLowerCase();

    if (requested === 'local') {
      return { name: 'local', provider: this.localVision };
    }

    if (requested === 'gemini') {
      return { name: 'gemini', provider: this.geminiVision };
    }

    if (requested === 'openai') {
      return { name: 'openai', provider: this.openAiVision };
    }

    if (requested === 'mock') {
      return { name: 'mock', provider: this.mockVision };
    }

    // Default 'existing' delegates to existingVisionProvider ('gemini' | 'openai' | 'mock')
    const existing = (
      this.configService.get<string>('ai.existingVisionProvider') || 'mock'
    ).toLowerCase();

    if (existing === 'gemini') {
      return { name: 'existing(gemini)', provider: this.geminiVision };
    }
    if (existing === 'openai') {
      return { name: 'existing(openai)', provider: this.openAiVision };
    }
    return { name: 'existing(mock)', provider: this.mockVision };
  }

  /**
   * Resolves the fallback vision provider if technical failure fallback is enabled.
   */
  resolveFallbackProvider(): {
    name: string;
    provider: VisionProvider;
  } | null {
    const isEnabled = Boolean(
      this.configService.get<boolean>('ai.visionFallbackEnabled'),
    );
    if (!isEnabled) {
      return null;
    }

    const fallbackType =
      this.configService.get<string>('ai.visionFallbackProvider') || 'existing';
    return this.resolveProvider(fallbackType);
  }

  /**
   * Executes image analysis via the resolved primary provider with optional fallback.
   */
  async analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult> {
    const primary = this.resolveProvider();
    const fallback = this.resolveFallbackProvider();

    this.logger.log(`Routing image analysis to primary vision provider: [${primary.name}]`);

    try {
      const result = await primary.provider.analyzeImage(input);
      this.logger.log(
        `Vision analysis successfully completed by provider [${primary.name}]. Objects detected: ${result.detectedObjects.length}`,
      );
      return result;
    } catch (primaryErr: unknown) {
      const errorMsg =
        primaryErr instanceof Error ? primaryErr.message : String(primaryErr);

      // Check if fallback is enabled and fallback provider is different from primary
      if (fallback && fallback.provider !== primary.provider) {
        this.logger.warn(
          `Primary vision provider [${primary.name}] failed: ${errorMsg}. Executing fallback to [${fallback.name}]... (vision_fallback_count=1)`,
        );

        try {
          const fallbackResult = await fallback.provider.analyzeImage(input);
          this.logger.log(
            `Vision analysis fallback successfully completed by [${fallback.name}]. Objects detected: ${fallbackResult.detectedObjects.length}`,
          );
          return fallbackResult;
        } catch (fallbackErr: unknown) {
          const fallbackMsg =
            fallbackErr instanceof Error
              ? fallbackErr.message
              : String(fallbackErr);
          this.logger.error(
            `Both primary [${primary.name}] and fallback [${fallback.name}] vision providers failed. Fallback error: ${fallbackMsg}`,
          );
          throw fallbackErr;
        }
      }

      this.logger.error(
        `Primary vision provider [${primary.name}] failed without fallback: ${errorMsg}`,
      );
      throw primaryErr;
    }
  }
}
