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

// ─── Adapter ──────────────────────────────────────────────────────────────────

@Injectable()
export class GeminiVisionAdapter implements VisionProvider {
  private readonly logger = new Logger(GeminiVisionAdapter.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModel: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.geminiApiKey') || '';
    this.model =
      this.configService.get<string>('ai.geminiModel') || 'gemini-3.5-flash';
    this.fallbackModel =
      this.configService.get<string>('ai.geminiFallbackModel') ||
      'gemini-3.5-flash-lite';
    this.timeoutMs = 60000;
  }

  async analyzeImage(input: VisionAnalysisInput): Promise<VisionAnalysisResult> {
    if (!this.apiKey) {
      throw new AiProviderException(
        'Gemini',
        'GEMINI_API_KEY is not configured in environment.',
      );
    }

    let imageBufferToSend = input.imageBuffer;
    let mimeTypeToSend = input.mimeType || 'image/jpeg';
    let imageDimensions: { width: number; height: number } | undefined;

    try {
      // Downscale and compress image for fast AI upload and inference (max 1024px, JPEG 80)
      imageBufferToSend = await sharp(input.imageBuffer)
        .rotate()
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mimeTypeToSend = 'image/jpeg';

      const meta = await sharp(imageBufferToSend).metadata();
      imageDimensions = { width: meta.width || 0, height: meta.height || 0 };

      this.logger.log(
        `Optimized image for Gemini vision: ${input.imageBuffer.length} bytes -> ${imageBufferToSend.length} bytes (${imageDimensions.width}x${imageDimensions.height})`,
      );
    } catch (resizeErr: unknown) {
      const msg = resizeErr instanceof Error ? resizeErr.message : String(resizeErr);
      this.logger.warn(`Could not downscale image before Gemini call: ${msg}`);
    }

    const base64Image = imageBufferToSend.toString('base64');
    const userPrompt = buildVisionUserPrompt(
      input.roomType,
      input.headingDegrees,
      input.calibratedDirection,
    );

    const defaultModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
    const modelsToTry = Array.from(
      new Set([this.model, this.fallbackModel, ...defaultModels].filter(Boolean)),
    );
    let lastError: unknown = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
      const currentModel = modelsToTry[attempt];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: VISION_SYSTEM_PROMPT }],
            },
            contents: [
              {
                parts: [
                  { text: userPrompt },
                  {
                    inline_data: {
                      mime_type: mimeTypeToSend,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              ...(currentModel.includes('3.5-flash') && !currentModel.includes('lite')
                ? { thinkingConfig: { thinkingBudget: 0 } }
                : {}),
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          // If transient overload (503/429) and there is a fallback model available
          if (
            (response.status === 503 || response.status === 429) &&
            attempt < modelsToTry.length - 1
          ) {
            this.logger.warn(
              `Gemini model '${currentModel}' returned HTTP ${response.status}. Retrying with fallback model '${modelsToTry[attempt + 1]}'...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          throw new AiProviderException(
            'Gemini',
            `HTTP ${response.status}: ${errorText}`,
          );
        }

        const data = (await response.json()) as Record<string, unknown>;
        const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
        const content = (candidates?.[0]?.content as Record<string, unknown>)?.parts as
          | Array<Record<string, unknown>>
          | undefined;
        const textContent = content?.[0]?.text as string | undefined;

        if (!textContent) {
          throw new AiProviderException(
            'Gemini',
            'Empty response content returned from Gemini.',
          );
        }

        // Extract token usage from Gemini response
        const usageMetadata = data.usageMetadata as Record<string, unknown> | undefined;
        const tokenUsage = usageMetadata
          ? {
              promptTokens: (usageMetadata.promptTokenCount as number) || 0,
              completionTokens: (usageMetadata.candidatesTokenCount as number) || 0,
              totalTokens: (usageMetadata.totalTokenCount as number) || 0,
            }
          : undefined;

        const processingDurationMs = Date.now() - startTime;

        const cleanJson = textContent
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        const parsedJson = JSON.parse(cleanJson) as Record<string, unknown>;

        const validated = normalizeAndValidateVisionResult(parsedJson, {
          provider: 'gemini',
          fallbackRoomType: input.roomType,
          modelName: currentModel,
          durationMs: processingDurationMs,
          imageDimensions,
          imageSizeBytes: imageBufferToSend.length,
          tokenUsage,
        });

        this.logger.log(
          `Gemini vision completed in ${processingDurationMs}ms | model=${currentModel} | objects=${validated.detectedObjects.length} | tokens=${tokenUsage?.totalTokens ?? 'N/A'}`,
        );

        return validated as VisionAnalysisResult;
      } catch (err: unknown) {
        clearTimeout(timeout);
        lastError = err;
        const errObj = err as { name?: string; message?: string; stack?: string };
        if (errObj.name === 'AbortError') {
          throw new AiProviderException(
            'Gemini',
            `Vision analysis request timed out (>${Math.round(this.timeoutMs / 1000)}s).`,
          );
        }
        if (
          attempt < modelsToTry.length - 1 &&
          (errObj.message?.includes('503') || errObj.message?.includes('429'))
        ) {
          this.logger.warn(
            `Retrying with fallback model '${modelsToTry[attempt + 1]}' after error: ${errObj.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }
    }

    if (lastError instanceof AiProviderException) throw lastError;
    const lastErrObj = lastError as { message?: string; stack?: string } | null;
    this.logger.error(
      `Gemini Vision analysis failed: ${lastErrObj?.message}`,
      lastErrObj?.stack,
    );
    throw new AiProviderException(
      'Gemini',
      lastErrObj?.message || 'Vision analysis failed',
    );
  }
}
