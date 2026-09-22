import {
  DirectionEnum,
  RemedyTypeEnum,
  ScoreBandEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';

export interface EvaluatedFinding {
  ruleCode: string;
  ruleName: string;
  category: string;
  verdict: VerdictEnum;
  severity: SeverityEnum;
  scoreImpact: number;
  targetObject: string;
  matchedObjectId?: string;
  zone?: DirectionEnum;
  reason: string;
  defaultRemedy: string;
  remedyType: RemedyTypeEnum;
}

export interface ElementalBalance {
  fire: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
  water: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
  earth: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
  air: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
  space: 'BALANCED' | 'DEFICIENT' | 'EXCESSIVE' | 'NEUTRAL';
}

export interface VastuEvaluationResult {
  overallScore: number;
  scoreBand: ScoreBandEnum;
  findings: EvaluatedFinding[];
  elementalBalance: ElementalBalance;
  evaluatedAt: Date;
}
