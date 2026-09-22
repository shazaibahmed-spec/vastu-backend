import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RemedyTypeEnum,
  SUPPORTED_LANGUAGES,
  SupportedLanguageEnum,
} from '../../../common/constants/index.js';
import { AiProviderException } from '../../../common/exceptions/domain.exception.js';
import {
  ExplanationInput,
  ExplanationResult,
  LLMProvider,
} from '../interfaces/llm-provider.interface.js';
import {
  buildExplanationSystemPrompt,
  EXPLANATION_PROMPT_VERSION,
} from '../prompts/explanation-prompt.template.js';
import { ExplanationResultSchema } from '../schemas/explanation.schema.js';

function normalizeBalance(
  val: any,
): 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL' {
  if (!val || typeof val !== 'string') return 'BALANCED';
  const upper = val.toUpperCase().trim();
  if (
    upper.includes('DEFICIENT') ||
    upper.includes('LOW') ||
    upper.includes('POOR') ||
    upper.includes('WEAK') ||
    upper.includes('IMBALANCE')
  ) {
    return 'DEFICIENT';
  }
  if (
    upper.includes('EXCESS') ||
    upper.includes('HIGH') ||
    upper.includes('STRONG') ||
    upper.includes('SEVERE')
  ) {
    return 'EXCESSIVE';
  }
  if (upper.includes('NEUTRAL') || upper.includes('MODERATE')) {
    return 'NEUTRAL';
  }
  return 'BALANCED';
}

function normalizeRemedyType(val: any): RemedyTypeEnum {
  if (!val || typeof val !== 'string') return RemedyTypeEnum.ELEMENTAL;
  const upper = val.toUpperCase().trim();
  if (upper.includes('STRUCT')) return RemedyTypeEnum.STRUCTURAL;
  if (upper.includes('ELEM')) return RemedyTypeEnum.ELEMENTAL;
  if (upper.includes('DECOR')) return RemedyTypeEnum.DECORATIVE;
  if (upper.includes('COLOR') || upper.includes('COLOUR'))
    return RemedyTypeEnum.COLOR;
  return RemedyTypeEnum.ELEMENTAL;
}

@Injectable()
export class GeminiLlmAdapter implements LLMProvider {
  private readonly logger = new Logger(GeminiLlmAdapter.name);
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

  async generateExplanation(
    input: ExplanationInput,
  ): Promise<ExplanationResult> {
    if (!this.apiKey) {
      throw new AiProviderException(
        'Gemini',
        'GEMINI_API_KEY is not configured in environment.',
      );
    }

    const lang = input.language || SupportedLanguageEnum.ENGLISH;
    const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || {
      name: 'English',
      code: SupportedLanguageEnum.ENGLISH,
    };
    const systemPrompt = buildExplanationSystemPrompt(
      langMeta.code,
      langMeta.name,
    );

    const findingsFormatted = input.findings
      .map(
        (f) =>
          `* [${f.verdict}] Rule: ${f.ruleCode} (${f.targetObject} in ${f.zone || 'unknown zone'}, Severity: ${f.severity})\n  Description: ${f.canonicalDescription}\n  Canonical Remedy: ${f.defaultRemedyText || 'None'}`,
      )
      .join('\n\n');

    const userPrompt = `
Room Type: ${input.roomType}
Overall Vastu Score: ${input.overallScore} / 100 (Band: ${input.scoreBand})
Requested Output Language: ${langMeta.name} (${langMeta.code})

Deterministic Rule Evaluation Findings:
${findingsFormatted}

${input.userNotes ? `<user_notes>${input.userNotes}</user_notes>` : ''}

Generate an empathetic summary, elemental balance evaluation (fire, water, earth, air, space), and practical actionable remedies in ${langMeta.name} (${langMeta.code}) without modifying canonical rule verdicts or internal codes.

Required JSON Structure:
{
  "summary": "...",
  "elementalBalance": {
    "fire": "BALANCED",
    "water": "BALANCED",
    "earth": "DEFICIENT",
    "air": "BALANCED",
    "space": "BALANCED"
  },
  "findingExplanations": [
    {
      "ruleCode": "BED-001-HEAD-POS",
      "laymanExplanation": "...",
      "actionableRemedy": "...",
      "remedyType": "ELEMENTAL"
    }
  ]
}
Notice: elementalBalance values must be one of "BALANCED", "DEFICIENT", "EXCESSIVE", "NEUTRAL".
remedyType must be one of "STRUCTURAL", "ELEMENTAL", "DECORATIVE", "COLOR".
Return strictly valid JSON only.
`;

    const defaultModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
    const modelsToTry = Array.from(
      new Set([this.model, this.fallbackModel, ...defaultModels].filter(Boolean)),
    );
    let lastError: any = null;

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
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
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

        const data = (await response.json()) as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
          throw new AiProviderException(
            'Gemini',
            'Empty completion content returned from Gemini.',
          );
        }

        const cleanJson = content
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        const parsedJson = JSON.parse(cleanJson);

        // Pre-sanitize and normalize Gemini output before strict schema validation
        const normalized = {
          summary:
            typeof parsedJson.summary === 'string' &&
            parsedJson.summary.trim().length > 0
              ? parsedJson.summary.trim()
              : 'Vastu spatial analysis completed.',
          elementalBalance: {
            fire: normalizeBalance(parsedJson.elementalBalance?.fire),
            water: normalizeBalance(parsedJson.elementalBalance?.water),
            earth: normalizeBalance(parsedJson.elementalBalance?.earth),
            air: normalizeBalance(parsedJson.elementalBalance?.air),
            space: normalizeBalance(parsedJson.elementalBalance?.space),
          },
          findingExplanations: Array.isArray(parsedJson.findingExplanations)
            ? parsedJson.findingExplanations.map((f: any) => ({
                ruleCode: String(f?.ruleCode || 'VASTU-RULE'),
                laymanExplanation: String(
                  f?.laymanExplanation ||
                    'Follow classical Vastu placement guidelines.',
                ),
                actionableRemedy: String(
                  f?.actionableRemedy ||
                    'Rebalance space according to elemental principles.',
                ),
                remedyType: normalizeRemedyType(f?.remedyType),
              }))
            : [],
          promptVersion: EXPLANATION_PROMPT_VERSION,
          modelVersion: currentModel,
          tokenUsage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
        };

        const validated = ExplanationResultSchema.parse(normalized);
        return validated as ExplanationResult;
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err;
        if (err.name === 'AbortError') {
          throw new AiProviderException(
            'Gemini',
            `LLM explanation request timed out (>${Math.round(this.timeoutMs / 1000)}s).`,
          );
        }
        if (
          attempt < modelsToTry.length - 1 &&
          (err.message?.includes('503') || err.message?.includes('429'))
        ) {
          this.logger.warn(
            `Retrying LLM with fallback model '${modelsToTry[attempt + 1]}' after error: ${err.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }
    }

    if (lastError instanceof AiProviderException) throw lastError;
    this.logger.error(
      `Gemini LLM explanation failed: ${lastError?.message}`,
      lastError?.stack,
    );
    throw new AiProviderException(
      'Gemini',
      lastError?.message || 'LLM explanation generation failed',
    );
  }
}
