import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
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

@Injectable()
export class OpenAiLlmAdapter implements LLMProvider {
  private readonly logger = new Logger(OpenAiLlmAdapter.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.openAiApiKey') || '';
    this.model = 'gpt-4o-mini';
    this.timeoutMs = 12000;
  }

  async generateExplanation(
    input: ExplanationInput,
  ): Promise<ExplanationResult> {
    if (!this.apiKey) {
      throw new AiProviderException(
        'OpenAI',
        'OPENAI_API_KEY is not configured in environment.',
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
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AiProviderException('OpenAI', `HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new AiProviderException('OpenAI', 'Empty completion content returned.');
      }

      const parsedJson = JSON.parse(content);
      const validated = ExplanationResultSchema.parse({
        ...parsedJson,
        promptVersion: EXPLANATION_PROMPT_VERSION,
        modelVersion: this.model,
        tokenUsage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      });

      return validated as ExplanationResult;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof AiProviderException) throw err;
      if (err.name === 'AbortError') {
        throw new AiProviderException(
          'OpenAI',
          'LLM explanation request timed out (>12s).',
        );
      }
      this.logger.error(
        `OpenAI LLM explanation failed: ${err.message}`,
        err.stack,
      );
      throw new AiProviderException('OpenAI', err.message);
    }
  }
}
