import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { AiProviderException } from '../../../common/exceptions/domain.exception.js';
import type {
  VisionAnalysisInput,
  VisionAnalysisResult,
  VisionProvider,
} from '../interfaces/vision-provider.interface.js';
import {
  buildVisionUserPrompt,
  VISION_SYSTEM_PROMPT,
} from '../prompts/vision-prompt.template.js';
import { normalizeAndValidateVisionResult } from '../utils/vision-normalization.util.js';

@Injectable()
export class OpenAiVisionAdapter implements VisionProvider {
  private readonly logger = new Logger(OpenAiVisionAdapter.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.openAiApiKey') || '';
    this.model = this.configService.get<string>('ai.openAiVisionModel') || 'gpt-4o';
    this.timeoutMs = 30000;
  }

  async analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult> {
    if (!this.apiKey) {
      throw new AiProviderException(
        'OpenAI',
        'OPENAI_API_KEY is not configured in environment.',
      );
    }

    const startTime = Date.now();
    let imageBufferToSend = input.imageBuffer;
    let mimeTypeToSend = input.mimeType || 'image/jpeg';
    let imageDimensions: { width: number; height: number } | undefined;

    try {
      imageBufferToSend = await sharp(input.imageBuffer)
        .rotate()
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mimeTypeToSend = 'image/jpeg';

      const meta = await sharp(imageBufferToSend).metadata();
      imageDimensions = { width: meta.width || 0, height: meta.height || 0 };
    } catch (resizeErr: unknown) {
      const msg = resizeErr instanceof Error ? resizeErr.message : String(resizeErr);
      this.logger.warn(`Could not downscale image before OpenAI call: ${msg}`);
    }

    const base64Image = imageBufferToSend.toString('base64');
    const dataUrl = `data:${mimeTypeToSend};base64,${base64Image}`;

    const userPrompt = buildVisionUserPrompt(
      input.roomType,
      input.headingDegrees,
      input.calibratedDirection,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.log(`Invoking OpenAI Vision model '${this.model}'...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: VISION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AiProviderException('OpenAI', `HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new AiProviderException('OpenAI', 'Empty response content returned.');
      }

      const processingDurationMs = Date.now() - startTime;
      const parsedJson = JSON.parse(content) as Record<string, unknown>;

      const tokenUsage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      const validated = normalizeAndValidateVisionResult(parsedJson, {
        provider: 'openai',
        fallbackRoomType: input.roomType,
        modelName: this.model,
        durationMs: processingDurationMs,
        imageDimensions,
        imageSizeBytes: imageBufferToSend.length,
        tokenUsage,
      });

      this.logger.log(
        `OpenAI vision completed in ${processingDurationMs}ms | model=${this.model} | objects=${validated.detectedObjects.length} | tokens=${tokenUsage?.totalTokens ?? 'N/A'}`,
      );

      return validated;
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof AiProviderException) throw err;

      const errObj = err as { name?: string; message?: string; stack?: string };
      if (errObj.name === 'AbortError') {
        throw new AiProviderException('OpenAI', 'Vision analysis request timed out (>30s).');
      }
      this.logger.error(`OpenAI Vision analysis failed: ${errObj.message}`, errObj.stack);
      throw new AiProviderException('OpenAI', errObj.message || 'Vision analysis failed');
    }
  }
}
