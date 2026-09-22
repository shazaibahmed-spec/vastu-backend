import { ScoreBandEnum, VerdictEnum } from '../../../common/constants/index.js';
import {
  ElementalBalance,
  EvaluatedFinding,
} from '../types/evaluation-result.js';

export class VastuScoreCalculator {
  /**
   * Computes the overall score bounded between 0 and 100 based on evaluated findings.
   */
  static calculateScore(findings: EvaluatedFinding[]): {
    score: number;
    scoreBand: ScoreBandEnum;
  } {
    if (findings.length === 0) {
      return { score: 70, scoreBand: ScoreBandEnum.FAIR };
    }

    let score = 100;

    for (const finding of findings) {
      if (finding.verdict === VerdictEnum.DEFECT) {
        score -= Math.abs(finding.scoreImpact);
      } else if (
        finding.verdict === VerdictEnum.COMPLIANT &&
        finding.scoreImpact > 0
      ) {
        // Minor reward for compliance up to ceiling
        score += finding.scoreImpact;
      }
    }

    const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
    const scoreBand = this.determineScoreBand(boundedScore);

    return { score: boundedScore, scoreBand };
  }

  /**
   * Maps numerical score into qualitative rating band.
   */
  static determineScoreBand(score: number): ScoreBandEnum {
    if (score >= 88) return ScoreBandEnum.EXCELLENT;
    if (score >= 72) return ScoreBandEnum.GOOD;
    if (score >= 55) return ScoreBandEnum.FAIR;
    return ScoreBandEnum.NEEDS_ATTENTION;
  }

  /**
   * Analyzes elemental balance based on presence of elemental defects or compliance.
   */
  static calculateElementalBalance(
    findings: EvaluatedFinding[],
  ): ElementalBalance {
    const balance: ElementalBalance = {
      fire: 'BALANCED',
      water: 'BALANCED',
      earth: 'BALANCED',
      air: 'BALANCED',
      space: 'BALANCED',
    };

    for (const finding of findings) {
      if (finding.verdict !== VerdictEnum.DEFECT) continue;

      const code = finding.ruleCode.toUpperCase();
      const reason = (finding.reason || '').toLowerCase();

      // Fire element triggers (South-East, Stoves, Agni)
      if (
        code.includes('STOVE') ||
        code.includes('AGNI') ||
        code.includes('FIRE') ||
        code.includes('POS-SE') ||
        reason.includes('fire')
      ) {
        balance.fire = 'DEFICIENT';
      }

      // Water element triggers (North-East, Sinks, Drainage)
      if (
        code.includes('SINK') ||
        code.includes('WATER') ||
        code.includes('ISHANYA') ||
        reason.includes('water')
      ) {
        balance.water = 'DEFICIENT';
      }

      // Earth element triggers (South-West, Heavy stability, Bed placement)
      if (
        code.includes('BED-001') ||
        code.includes('BED-002') ||
        code.includes('SOFA-SW') ||
        reason.includes('stability') ||
        reason.includes('earth')
      ) {
        balance.earth = 'DEFICIENT';
      }

      // Air element triggers (North-West, Ventilation, Directional flow)
      if (
        code.includes('DOOR') ||
        code.includes('DESK') ||
        reason.includes('air') ||
        reason.includes('wind')
      ) {
        balance.air = 'DEFICIENT';
      }

      // Space element triggers (Overhead beams, mirror reflections, central Brahmasthan congestion)
      if (
        code.includes('BEAM') ||
        code.includes('MIRROR') ||
        code.includes('CENTER') ||
        code.includes('BRAHMA') ||
        reason.includes('beam') ||
        reason.includes('brahmasthan') ||
        reason.includes('space')
      ) {
        balance.space = 'DEFICIENT';
      }
    }

    return balance;
  }
}
