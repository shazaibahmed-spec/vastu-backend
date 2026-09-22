import {
  DirectionEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  SeverityEnum,
  SupportedLanguageEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';

export interface ExplanationFindingInput {
  ruleCode: string;
  category: string;
  verdict: VerdictEnum;
  severity: SeverityEnum;
  targetObject: string;
  zone?: DirectionEnum;
  canonicalDescription: string;
  defaultRemedyText?: string;
}

export interface ExplanationInput {
  roomType: RoomTypeEnum;
  overallScore: number;
  scoreBand: string;
  findings: ExplanationFindingInput[];
  userNotes?: string;
  language?: SupportedLanguageEnum;
}

export interface FindingExplanation {
  ruleCode: string;
  laymanExplanation: string;
  actionableRemedy: string;
  remedyType: RemedyTypeEnum;
}

export interface ExplanationResult {
  summary: string;
  elementalBalance: {
    fire: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    water: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    earth: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    air: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
    space: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
  };
  findingExplanations: FindingExplanation[];
  promptVersion?: string;
  modelVersion?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateExplanation(input: ExplanationInput): Promise<ExplanationResult>;
}
