import { Injectable, Logger } from '@nestjs/common';
import {
  RemedyTypeEnum,
  ScoreBandEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';
import { VastuRuleRegistry } from '../rules/rule-registry.js';
import {
  EvaluationContext,
  EvaluatedObjectFact,
} from '../types/evaluation-context.js';
import {
  EvaluatedFinding,
  VastuEvaluationResult,
} from '../types/evaluation-result.js';
import { VastuConditionEvaluator } from './condition-evaluator.js';
import { VastuScoreCalculator } from './score-calculator.js';

@Injectable()
export class VastuRulesEngine {
  private readonly logger = new Logger(VastuRulesEngine.name);

  /**
   * Deterministically evaluates an architectural space against classical Vastu rules.
   */
  evaluate(context: EvaluationContext): VastuEvaluationResult {
    this.logger.debug(
      `Evaluating Vastu rules for room '${context.roomType}' with ${context.detectedObjects.length} detected objects.`,
    );

    const rules = VastuRuleRegistry.getRulesForRoom(context.roomType);
    const findings: EvaluatedFinding[] = [];

    // 1. Detect non-architectural image (e.g. outdoor nature, waterfall, animal, vehicle)
    if (context.isArchitecturalSpace === false) {
      this.logger.warn(
        `Non-architectural image detected for room evaluation '${context.roomType}'`,
      );
      findings.push({
        ruleCode: 'NON-ARCHITECTURAL-IMAGE',
        ruleName: 'Non-Architectural Image Detected',
        category: 'ORIENTATION',
        verdict: VerdictEnum.DEFECT,
        severity: SeverityEnum.CRITICAL,
        scoreImpact: -100,
        targetObject: 'room',
        reason:
          'The uploaded photograph appears to be an outdoor landscape, nature scene, or non-room subject rather than an indoor architectural space. Classical Vastu Shastra applies exclusively to built living and working environments.',
        defaultRemedy: `Please upload a clear photograph taken inside your actual ${context.roomType.toLowerCase().replace('_', ' ')} showing its physical furniture and layout.`,
        remedyType: RemedyTypeEnum.STRUCTURAL,
      });

      return {
        overallScore: 0,
        scoreBand: ScoreBandEnum.NEEDS_ATTENTION,
        findings,
        elementalBalance: {
          fire: 'NEUTRAL',
          water: 'NEUTRAL',
          earth: 'NEUTRAL',
          air: 'NEUTRAL',
          space: 'NEUTRAL',
        },
        evaluatedAt: new Date(),
      };
    }

    // 2. Detect zero recognizable objects in room
    if (context.detectedObjects.length === 0) {
      this.logger.warn(
        `Zero objects detected in room evaluation '${context.roomType}'`,
      );
      findings.push({
        ruleCode: 'NO-OBJECTS-DETECTED',
        ruleName: 'No Physical Fixtures Identified',
        category: 'PLACEMENT',
        verdict: VerdictEnum.DEFECT,
        severity: SeverityEnum.HIGH,
        scoreImpact: -60,
        targetObject: 'room',
        reason:
          'No recognizable furniture, doors, or functional fixtures were identified in this photograph. Vastu compliance cannot certify an empty or unrecognizable frame as compliant.',
        defaultRemedy: `Please upload a wider-angle photo showing the primary fixtures of your ${context.roomType.toLowerCase().replace('_', ' ')} (e.g. bed, stove, seating, or desk).`,
        remedyType: RemedyTypeEnum.STRUCTURAL,
      });
    }

    // Detect spatial category discrepancy
    if (
      context.detectedRoomType &&
      context.detectedRoomType !== context.roomType
    ) {
      this.logger.warn(
        `Room category mismatch detected: declared '${context.roomType}' vs visually identified '${context.detectedRoomType}'`,
      );
      findings.push({
        ruleCode: 'ROOM-MISMATCH-001',
        ruleName: 'Room Category Discrepancy',
        category: 'ORIENTATION',
        verdict: VerdictEnum.DEFECT,
        severity: SeverityEnum.HIGH,
        scoreImpact: -35,
        targetObject: 'room',
        reason: `The photograph visually corresponds to a ${context.detectedRoomType}, but was scanned under the ${context.roomType} category. Vastu assessments require evaluating the intended physical space.`,
        defaultRemedy: `Please rescan the space selecting '${context.detectedRoomType}', or upload a photograph showing key functional fixtures of your ${context.roomType}.`,
        remedyType: RemedyTypeEnum.STRUCTURAL,
      });
    }

    for (const rule of rules) {
      const targetObjectKey = rule.targetObject.toLowerCase();

      // Find objects matching rule targetObject (including cross-model COCO synonyms)
      const matchingObjects = context.detectedObjects.filter((obj) =>
        this.matchesTargetObject(obj.objectType, targetObjectKey),
      );

      if (matchingObjects.length === 0) {
        // Evaluate existence conditions if target object is absent
        if (
          rule.condition.op === 'NOT_EXISTS' ||
          targetObjectKey === 'room'
        ) {
          const isMatch = VastuConditionEvaluator.evaluate(
            rule.condition,
            undefined,
            context.detectedObjects,
            context,
          );

          if (isMatch) {
            findings.push(this.createFinding(rule));
          }
        }
        continue;
      }

      // Evaluate condition for each matching object detected
      let ruleMatched = false;
      for (const matchedObj of matchingObjects) {
        const isMatch = VastuConditionEvaluator.evaluate(
          rule.condition,
          matchedObj,
          context.detectedObjects,
          context,
        );

        if (isMatch && !ruleMatched) {
          findings.push(this.createFinding(rule, matchedObj));
          ruleMatched = true;
        }
      }
    }

    // 3. Safety Net: If physical fixtures were detected, but zero specific directional defects or compliance triggered,
    // emit a deterministic spatial harmony finding rather than presenting an empty findings list and broken flow.
    if (context.detectedObjects.length > 0 && findings.length === 0) {
      const primaryObj = context.detectedObjects[0];
      findings.push({
        ruleCode: 'GEN-SPATIAL-HARMONY',
        ruleName: 'Spatial Layout Harmony',
        category: 'PLACEMENT',
        verdict: VerdictEnum.COMPLIANT,
        severity: SeverityEnum.LOW,
        scoreImpact: 5,
        targetObject: primaryObj.objectType,
        matchedObjectId: primaryObj.id,
        zone: primaryObj.zone,
        reason: `Physical fixtures (${context.detectedObjects.map((o) => o.label).join(', ')}) were successfully identified in the space and are placed in general functional balance with no adverse directional Vastu defects detected.`,
        defaultRemedy:
          'Maintain clean circulation pathways, open natural illumination, and keep the central floor area uncluttered.',
        remedyType: RemedyTypeEnum.DECORATIVE,
      });
    }

    const { score, scoreBand } = VastuScoreCalculator.calculateScore(findings);
    const elementalBalance =
      VastuScoreCalculator.calculateElementalBalance(findings);

    return {
      overallScore: score,
      scoreBand,
      findings,
      elementalBalance,
      evaluatedAt: new Date(),
    };
  }

  private matchesTargetObject(detectedType: string, targetKey: string): boolean {
    const dType = detectedType.toLowerCase();
    const tKey = targetKey.toLowerCase();
    if (dType === tKey) return true;

    // Synonyms & category grouping across vision models and Vastu fixtures
    const synonyms: Record<string, string[]> = {
      entrance_door: ['entrance_door', 'door', 'main_door', 'gateway', 'entryway'],
      door: ['door', 'entrance_door', 'main_door', 'gateway', 'entryway'],
      sofa: ['sofa', 'couch', 'sectional', 'loveseat'],
      chair: ['chair', 'armchair', 'recliner', 'office_chair'],
      table: ['table', 'dining_table', 'center_table', 'coffee_table'],
      television: ['television', 'tv', 'monitor', 'screen', 'tv_unit'],
      gas_stove: ['gas_stove', 'stove', 'cooking_range', 'oven', 'burner'],
      stove: ['stove', 'gas_stove', 'cooking_range', 'oven', 'burner'],
      sink: ['sink', 'kitchen_sink', 'washbasin'],
      refrigerator: ['refrigerator', 'fridge'],
      microwave: ['microwave', 'microwave_oven', 'oven'],
      desk: ['desk', 'work_desk', 'table', 'dining_table', 'study_table', 'workstation', 'computer', 'laptop'],
      wardrobe: ['wardrobe', 'heavy_wardrobe', 'closet', 'cupboard', 'cabinet'],
      shoe_rack: ['shoe_rack', 'shoe_cabinet', 'cabinet'],
      indoor_plants: ['indoor_plants', 'plant', 'potted_plant'],
      bookshelf: ['bookshelf', 'bookcase', 'book', 'cabinet'],
      mirror: ['mirror', 'dressing_table'],
    };

    const allowed = synonyms[tKey];
    if (allowed && allowed.includes(dType)) {
      return true;
    }

    return false;
  }

  private createFinding(
    rule: any,
    matchedObj?: EvaluatedObjectFact,
  ): EvaluatedFinding {
    return {
      ruleCode: rule.code,
      ruleName: rule.name,
      category: rule.category,
      verdict: rule.verdictOnMatch,
      severity: rule.severity,
      scoreImpact: rule.scoreImpact,
      targetObject: rule.targetObject,
      matchedObjectId: matchedObj?.id,
      zone: matchedObj?.zone,
      reason: rule.description,
      defaultRemedy: rule.defaultRemedy,
      remedyType: rule.remedyType,
    };
  }
}
