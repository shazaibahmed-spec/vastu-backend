import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiLlmAdapter } from './adapters/gemini-llm.adapter.js';
import { GeminiVisionAdapter } from './adapters/gemini-vision.adapter.js';
import { MockLlmAdapter } from './adapters/mock-llm.adapter.js';
import { MockVisionAdapter } from './adapters/mock-vision.adapter.js';
import { OpenAiLlmAdapter } from './adapters/openai-llm.adapter.js';
import { OpenAiVisionAdapter } from './adapters/openai-vision.adapter.js';
import { LocalVisionAdapter } from './adapters/local-vision.adapter.js';
import { VisionRouterService } from './services/vision-router.service.js';

export const VISION_PROVIDER_TOKEN = 'VISION_PROVIDER_TOKEN';
export const LLM_PROVIDER_TOKEN = 'LLM_PROVIDER_TOKEN';

@Module({
  providers: [
    MockVisionAdapter,
    OpenAiVisionAdapter,
    GeminiVisionAdapter,
    LocalVisionAdapter,
    VisionRouterService,
    MockLlmAdapter,
    OpenAiLlmAdapter,
    GeminiLlmAdapter,
    {
      provide: VISION_PROVIDER_TOKEN,
      useExisting: VisionRouterService,
    },
    {
      provide: LLM_PROVIDER_TOKEN,
      useFactory: (
        configService: ConfigService,
        mockLlm: MockLlmAdapter,
        openAiLlm: OpenAiLlmAdapter,
        geminiLlm: GeminiLlmAdapter,
      ) => {
        const provider = configService.get<string>('ai.llmProvider');
        if (provider === 'gemini') {
          return geminiLlm;
        }
        if (provider === 'openai') {
          return openAiLlm;
        }
        return mockLlm;
      },
      inject: [
        ConfigService,
        MockLlmAdapter,
        OpenAiLlmAdapter,
        GeminiLlmAdapter,
      ],
    },
  ],
  exports: [
    VISION_PROVIDER_TOKEN,
    LLM_PROVIDER_TOKEN,
    MockVisionAdapter,
    MockLlmAdapter,
    GeminiVisionAdapter,
    GeminiLlmAdapter,
    OpenAiVisionAdapter,
    OpenAiLlmAdapter,
    LocalVisionAdapter,
    VisionRouterService,
  ],
})
export class AiModule {}
