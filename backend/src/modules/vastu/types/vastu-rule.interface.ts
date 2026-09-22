import {
  RemedyTypeEnum,
  RoomTypeEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';
import { RuleCondition } from './rule-condition.type.js';

export interface VastuRuleDefinition {
  readonly code: string;
  readonly roomType: RoomTypeEnum;
  readonly category: 'PLACEMENT' | 'ORIENTATION' | 'ELEMENTAL' | 'OBSTRUCTION';
  readonly name: string;
  readonly description: string;
  readonly targetObject: string;
  readonly condition: RuleCondition;
  readonly severity: SeverityEnum;
  readonly verdictOnMatch: VerdictEnum;
  readonly scoreImpact: number;
  readonly defaultRemedy: string;
  readonly remedyType: RemedyTypeEnum;
  readonly isActive: boolean;
}
