import { z } from 'zod';
import { RemedyTypeEnum } from '../../../common/constants/index.js';

export const FindingExplanationSchema = z.object({
  ruleCode: z.string(),
  laymanExplanation: z.string(),
  actionableRemedy: z.string(),
  remedyType: z.nativeEnum(RemedyTypeEnum),
});

export const ExplanationResultSchema = z.object({
  summary: z.string(),
  elementalBalance: z.object({
    fire: z.enum(['BALANCED', 'DEFICIENT', 'EXCESSIVE', 'NEUTRAL']),
    water: z.enum(['BALANCED', 'DEFICIENT', 'EXCESSIVE', 'NEUTRAL']),
    earth: z.enum(['BALANCED', 'DEFICIENT', 'EXCESSIVE', 'NEUTRAL']),
    air: z.enum(['BALANCED', 'DEFICIENT', 'EXCESSIVE', 'NEUTRAL']),
    space: z.enum(['BALANCED', 'DEFICIENT', 'EXCESSIVE', 'NEUTRAL']),
  }),
  findingExplanations: z.array(FindingExplanationSchema),
  promptVersion: z.string().optional(),
  modelVersion: z.string().optional(),
  tokenUsage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});
