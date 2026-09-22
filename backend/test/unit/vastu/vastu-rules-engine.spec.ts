import { describe, expect, it } from 'vitest';
import {
  DirectionEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  ScoreBandEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../src/common/constants/index.js';
import { VastuConditionEvaluator } from '../../../src/modules/vastu/engine/condition-evaluator.js';
import { VastuScoreCalculator } from '../../../src/modules/vastu/engine/score-calculator.js';
import { VastuRulesEngine } from '../../../src/modules/vastu/engine/vastu-rules-engine.js';
import { VastuRuleRegistry } from '../../../src/modules/vastu/rules/rule-registry.js';
import { EvaluationContext } from '../../../src/modules/vastu/types/evaluation-context.js';

describe('Vastu Rules Engine Suite', () => {
  const engine = new VastuRulesEngine();

  describe('Rule Registry', () => {
    it('should register all classical seed rules for 5 room types', () => {
      const allRules = VastuRuleRegistry.getAllRules();
      expect(allRules.length).toBeGreaterThanOrEqual(18);

      const bedroomRules = VastuRuleRegistry.getRulesForRoom(RoomTypeEnum.BEDROOM);
      expect(bedroomRules.length).toBeGreaterThanOrEqual(6);

      const kitchenRules = VastuRuleRegistry.getRulesForRoom(RoomTypeEnum.KITCHEN);
      expect(kitchenRules.length).toBeGreaterThanOrEqual(4);

      const entranceRules = VastuRuleRegistry.getRulesForRoom(RoomTypeEnum.MAIN_ENTRANCE);
      expect(entranceRules.length).toBeGreaterThanOrEqual(4);

      const livingRules = VastuRuleRegistry.getRulesForRoom(RoomTypeEnum.LIVING_ROOM);
      expect(livingRules.length).toBeGreaterThanOrEqual(3);

      const officeRules = VastuRuleRegistry.getRulesForRoom(RoomTypeEnum.OFFICE);
      expect(officeRules.length).toBeGreaterThanOrEqual(4);
    });

    it('should find rule by code', () => {
      const rule = VastuRuleRegistry.getRuleByCode('BED-001-POS-SW');
      expect(rule).toBeDefined();
      expect(rule?.name).toContain('South-West');
    });
  });

  describe('Bedroom Evaluation', () => {
    it('should evaluate compliant bedroom with bed in South-West and head South', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'King Bed',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.95,
            attributes: {
              headboardDirection: DirectionEnum.SOUTH,
              underCeilingBeam: false,
            },
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.overallScore).toBe(100);
      expect(result.scoreBand).toBe(ScoreBandEnum.EXCELLENT);
      expect(result.findings.some((f) => f.ruleCode === 'BED-001-POS-SW')).toBe(true);
      expect(result.findings.some((f) => f.ruleCode === 'BED-004-HEAD-SOUTH-COMPLIANT')).toBe(true);
      expect(result.findings.some((f) => f.verdict === VerdictEnum.DEFECT)).toBe(false);
      expect(result.elementalBalance.earth).toBe('BALANCED');
    });

    it('should detect critical defect when bed is in North-East with head facing North', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Bed',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.2, y: 0.2 },
            confidence: 0.92,
            attributes: {
              headboardDirection: DirectionEnum.NORTH,
            },
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.overallScore).toBeLessThanOrEqual(50);
      expect(result.scoreBand).toBe(ScoreBandEnum.NEEDS_ATTENTION);

      const neFinding = result.findings.find((f) => f.ruleCode === 'BED-002-POS-NE-DEFECT');
      expect(neFinding).toBeDefined();
      expect(neFinding?.severity).toBe(SeverityEnum.CRITICAL);
      expect(neFinding?.scoreImpact).toBe(-25);

      const headFinding = result.findings.find((f) => f.ruleCode === 'BED-003-HEAD-NORTH-DEFECT');
      expect(headFinding).toBeDefined();
      expect(headFinding?.severity).toBe(SeverityEnum.CRITICAL);
    });

    it('should detect mirror reflecting bed and overhead beam defects', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Bed',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.9,
            attributes: {
              headboardDirection: DirectionEnum.SOUTH,
              underCeilingBeam: true,
            },
          },
          {
            objectType: 'mirror',
            label: 'Vanity Mirror',
            zone: DirectionEnum.NORTH,
            relativePosition: { x: 0.8, y: 0.3 },
            confidence: 0.88,
            attributes: {
              reflectsBed: true,
            },
          },
        ],
      };

      const result = engine.evaluate(context);
      const mirrorFinding = result.findings.find((f) => f.ruleCode === 'BED-005-MIRROR-BED-REFLECTION');
      expect(mirrorFinding).toBeDefined();
      expect(mirrorFinding?.severity).toBe(SeverityEnum.HIGH);

      const beamFinding = result.findings.find((f) => f.ruleCode === 'BED-006-BEAM-OVERHEAD');
      expect(beamFinding).toBeDefined();
      expect(beamFinding?.severity).toBe(SeverityEnum.HIGH);

      expect(result.elementalBalance.space).toBe('DEFICIENT');
    });

    it('should detect defect when bed is in Center (Brahmasthan) with head facing East using alias', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Master Bed',
            zone: DirectionEnum.CENTER,
            relativePosition: { x: 0.5, y: 0.72 },
            confidence: 0.92,
            attributes: {
              headboardOrientation: DirectionEnum.EAST,
              underCeilingBeam: false,
            },
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.overallScore).toBe(85);
      expect(result.scoreBand).toBe(ScoreBandEnum.GOOD);

      const centerFinding = result.findings.find(
        (f) => f.ruleCode === 'BED-007-POS-CENTER-DEFECT',
      );
      expect(centerFinding).toBeDefined();
      expect(centerFinding?.verdict).toBe(VerdictEnum.DEFECT);
      expect(centerFinding?.severity).toBe(SeverityEnum.HIGH);
      expect(centerFinding?.scoreImpact).toBe(-25);

      const eastFinding = result.findings.find(
        (f) => f.ruleCode === 'BED-008-HEAD-EAST-COMPLIANT',
      );
      expect(eastFinding).toBeDefined();
      expect(eastFinding?.verdict).toBe(VerdictEnum.COMPLIANT);

      expect(result.elementalBalance.space).toBe('DEFICIENT');
    });

    it('should clearly differentiate facing South (auspicious 100) from facing East with bed in Center (85)', () => {
      // Facing South: Bed in South wall, head facing South
      const southContext: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Bed',
            zone: DirectionEnum.SOUTH,
            relativePosition: { x: 0.51, y: 0.72 },
            confidence: 0.95,
            attributes: { headboardOrientation: DirectionEnum.SOUTH },
          },
        ],
      };
      const southResult = engine.evaluate(southContext);
      expect(southResult.overallScore).toBe(100);
      expect(southResult.scoreBand).toBe(ScoreBandEnum.EXCELLENT);
      expect(southResult.findings.some((f) => f.verdict === VerdictEnum.DEFECT)).toBe(false);

      // Facing East: Bed shifted to Center, head facing East
      const eastContext: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Bed',
            zone: DirectionEnum.CENTER,
            relativePosition: { x: 0.5, y: 0.72 },
            confidence: 0.95,
            attributes: { headboardOrientation: DirectionEnum.EAST },
          },
        ],
      };
      const eastResult = engine.evaluate(eastContext);
      expect(eastResult.overallScore).toBe(85);
      expect(eastResult.scoreBand).toBe(ScoreBandEnum.GOOD);
      expect(eastResult.findings.some((f) => f.ruleCode === 'BED-007-POS-CENTER-DEFECT')).toBe(true);
    });

    it('should detect bed in South-East (Agni fire corner defect)', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Bed',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.8, y: 0.8 },
            confidence: 0.9,
            attributes: { headboardDirection: DirectionEnum.SOUTH },
          },
        ],
      };

      const result = engine.evaluate(context);
      const seFinding = result.findings.find(
        (f) => f.ruleCode === 'BED-009-POS-SE-DEFECT',
      );
      expect(seFinding).toBeDefined();
      expect(seFinding?.severity).toBe(SeverityEnum.HIGH);
      expect(result.elementalBalance.fire).toBe('DEFICIENT');
    });
  });

  describe('Kitchen Evaluation', () => {
    it('should evaluate compliant kitchen with stove in SE and sink in NE', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'gas_stove',
            label: 'Cooktop',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.8, y: 0.8 },
            confidence: 0.95,
            attributes: {},
          },
          {
            objectType: 'sink',
            label: 'Water Sink',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.1, y: 0.1 },
            confidence: 0.92,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.overallScore).toBe(100);
      expect(result.findings.some((f) => f.ruleCode === 'KIT-001-STOVE-SE')).toBe(true);
      expect(result.findings.some((f) => f.ruleCode === 'KIT-003-SINK-NE')).toBe(true);
      expect(result.elementalBalance.fire).toBe('BALANCED');
      expect(result.elementalBalance.water).toBe('BALANCED');
    });

    it('should detect critical defect when stove is in North-East', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'gas_stove',
            label: 'Gas Stove',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.9,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      const finding = result.findings.find((f) => f.ruleCode === 'KIT-002-STOVE-NE-DEFECT');
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(SeverityEnum.CRITICAL);
      expect(finding?.scoreImpact).toBe(-30);
      expect(result.elementalBalance.fire).toBe('DEFICIENT');
    });

    it('should detect fire-water clash when stove is within 0.9m of sink', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'gas_stove',
            label: 'Gas Stove',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.95,
            attributes: {},
          },
          {
            objectType: 'sink',
            label: 'Sink',
            zone: DirectionEnum.SOUTH_EAST,
            relativePosition: { x: 0.52, y: 0.51 }, // ~0.08m apart
            confidence: 0.91,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      const clashFinding = result.findings.find((f) => f.ruleCode === 'KIT-004-FIRE-WATER-CLASH');
      expect(clashFinding).toBeDefined();
      expect(clashFinding?.severity).toBe(SeverityEnum.HIGH);
      expect(clashFinding?.defaultRemedy).toContain('wooden partition');
    });

    it('should detect critical defect when a bed is located in the kitchen', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Master Bed',
            zone: DirectionEnum.NORTH,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.95,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      const bedInKitchen = result.findings.find(
        (f) => f.ruleCode === 'KIT-005-BED-IN-KITCHEN',
      );
      expect(bedInKitchen).toBeDefined();
      expect(bedInKitchen?.severity).toBe(SeverityEnum.CRITICAL);
      expect(result.overallScore).toBeLessThanOrEqual(70);
    });

    it('should detect critical defect when stove is in the center (Brahmasthan) of kitchen', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'gas_stove',
            label: 'Center Cooking Range',
            zone: DirectionEnum.CENTER,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.95,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      const stoveCenter = result.findings.find(
        (f) => f.ruleCode === 'KIT-006-STOVE-CENTER-DEFECT',
      );
      expect(stoveCenter).toBeDefined();
      expect(stoveCenter?.severity).toBe(SeverityEnum.CRITICAL);
      expect(stoveCenter?.scoreImpact).toBe(-30);
      expect(result.overallScore).toBe(70);
    });

    it('should flag ROOM-MISMATCH-001 when declared room differs from detected room', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedRoomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [
          {
            objectType: 'bed',
            label: 'Master Bed',
            zone: DirectionEnum.NORTH,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.95,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      const mismatch = result.findings.find(
        (f) => f.ruleCode === 'ROOM-MISMATCH-001',
      );
      expect(mismatch).toBeDefined();
      expect(mismatch?.severity).toBe(SeverityEnum.HIGH);
      expect(mismatch?.reason).toContain('BEDROOM');
      expect(result.overallScore).toBeLessThanOrEqual(40);
    });
  });

  describe('Main Entrance Evaluation', () => {
    it('should evaluate compliant entrance in North-East', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.MAIN_ENTRANCE,
        detectedObjects: [
          {
            objectType: 'entrance_door',
            label: 'Main Door',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.96,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.some((f) => f.ruleCode === 'ENT-001-DOOR-AUSPICIOUS')).toBe(true);
      expect(result.overallScore).toBe(100);
    });

    it('should detect South-West entrance defect and mirror facing door', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.MAIN_ENTRANCE,
        detectedObjects: [
          {
            objectType: 'entrance_door',
            label: 'Main Door',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.95,
            attributes: {},
          },
          {
            objectType: 'mirror',
            label: 'Foyer Mirror',
            zone: DirectionEnum.NORTH,
            relativePosition: { x: 0.5, y: 0.2 },
            confidence: 0.88,
            attributes: { reflectsEntranceDoor: true },
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.some((f) => f.ruleCode === 'ENT-002-DOOR-SW-DEFECT')).toBe(true);
      expect(result.findings.some((f) => f.ruleCode === 'ENT-003-MIRROR-FACING-DOOR')).toBe(true);
      expect(result.overallScore).toBe(65);
      expect(result.scoreBand).toBe(ScoreBandEnum.FAIR);
    });
  });

  describe('Office & Living Room Evaluation', () => {
    it('should evaluate office desk facing North with solid wall backdrop', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.OFFICE,
        detectedObjects: [
          {
            objectType: 'desk',
            label: 'Work Desk',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.94,
            attributes: {
              facingDirection: DirectionEnum.NORTH,
              hasSolidWallBehind: true,
              windowBehindChair: false,
            },
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.some((f) => f.ruleCode === 'OFF-001-DESK-FACING-NE')).toBe(true);
      expect(result.findings.some((f) => f.ruleCode === 'OFF-002-WALL-BACKDROP')).toBe(true);
      expect(result.overallScore).toBe(100);
    });

    it('should detect living room television in North-East defect', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.LIVING_ROOM,
        detectedObjects: [
          {
            objectType: 'television',
            label: 'TV Set',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.9,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      const tvFinding = result.findings.find((f) => f.ruleCode === 'LIV-002-TV-NE-DEFECT');
      expect(tvFinding).toBeDefined();
      expect(tvFinding?.severity).toBe(SeverityEnum.MEDIUM);
    });

    it('should evaluate living room chairs in East zone as compliant finding', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.LIVING_ROOM,
        detectedObjects: [
          {
            objectType: 'chair',
            label: 'Chair',
            zone: DirectionEnum.EAST,
            relativePosition: { x: 0.3, y: 0.5 },
            confidence: 0.85,
            attributes: {},
          },
          {
            objectType: 'chair',
            label: 'Accent Chair',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.7, y: 0.5 },
            confidence: 0.78,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.length).toBeGreaterThan(0);
      const chairFinding = result.findings.find(
        (f) => f.ruleCode === 'LIV-004-CHAIR-EAST-COMPLIANT',
      );
      expect(chairFinding).toBeDefined();
      expect(chairFinding?.verdict).toBe(VerdictEnum.COMPLIANT);
      expect(result.overallScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Condition Evaluator Unit Coverage', () => {
    it('should handle logical AND & OR correctly', () => {
      const obj = {
        objectType: 'bed',
        label: 'Bed',
        zone: DirectionEnum.SOUTH_WEST,
        relativePosition: { x: 0.5, y: 0.5 },
        confidence: 0.9,
        attributes: { a: 1, b: 2 },
      };
      const ctx: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [obj],
      };

      const andCondition = {
        op: 'AND' as const,
        conditions: [
          { field: 'zone', op: 'EQUALS' as const, value: DirectionEnum.SOUTH_WEST },
          { field: 'attributes.a', op: 'EQUALS' as const, value: 1 },
        ],
      };
      expect(VastuConditionEvaluator.evaluate(andCondition, obj, [obj], ctx)).toBe(true);

      const orCondition = {
        op: 'OR' as const,
        conditions: [
          { field: 'zone', op: 'EQUALS' as const, value: DirectionEnum.NORTH },
          { field: 'attributes.b', op: 'EQUALS' as const, value: 2 },
        ],
      };
      expect(VastuConditionEvaluator.evaluate(orCondition, obj, [obj], ctx)).toBe(true);
    });

    it('should evaluate numeric comparisons GREATER_THAN and LESS_THAN', () => {
      const obj = {
        objectType: 'test',
        label: 'Test',
        zone: DirectionEnum.NORTH,
        relativePosition: { x: 0.7, y: 0.3 },
        confidence: 0.8,
        attributes: { count: 5 },
      };
      const ctx: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        detectedObjects: [obj],
      };

      expect(
        VastuConditionEvaluator.evaluate(
          { field: 'attributes.count', op: 'GREATER_THAN', value: 3 },
          obj,
          [obj],
          ctx,
        ),
      ).toBe(true);

      expect(
        VastuConditionEvaluator.evaluate(
          { field: 'attributes.count', op: 'LESS_THAN', value: 10 },
          obj,
          [obj],
          ctx,
        ),
      ).toBe(true);
    });
  });

  describe('Non-Architectural & Zero Objects Edge Cases', () => {
    it('should award 0 score and critical defect when image is not an architectural room', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        isArchitecturalSpace: false,
        detectedObjects: [],
      };

      const result = engine.evaluate(context);
      expect(result.overallScore).toBe(0);
      expect(result.scoreBand).toBe(ScoreBandEnum.NEEDS_ATTENTION);
      const finding = result.findings.find(
        (f) => f.ruleCode === 'NON-ARCHITECTURAL-IMAGE',
      );
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(SeverityEnum.CRITICAL);
      expect(result.elementalBalance.fire).toBe('NEUTRAL');
    });

    it('should penalize zero objects detected in indoor space', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.BEDROOM,
        isArchitecturalSpace: true,
        detectedObjects: [],
      };

      const result = engine.evaluate(context);
      expect(result.overallScore).toBeLessThanOrEqual(40);
      const finding = result.findings.find(
        (f) => f.ruleCode === 'NO-OBJECTS-DETECTED',
      );
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe(SeverityEnum.HIGH);
    });

    it('should evaluate YOLO detected "door" in South for MAIN_ENTRANCE as defect', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.MAIN_ENTRANCE,
        detectedObjects: [
          {
            objectType: 'door',
            label: 'Door',
            zone: DirectionEnum.SOUTH,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.88,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.length).toBeGreaterThan(0);
      const finding = result.findings.find(
        (f) => f.ruleCode === 'ENT-005-DOOR-SOUTH-DEFECT',
      );
      expect(finding).toBeDefined();
      expect(finding?.verdict).toBe(VerdictEnum.DEFECT);
    });

    it('should evaluate YOLO detected "desk" in South-West for OFFICE without attributes', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.OFFICE,
        detectedObjects: [
          {
            objectType: 'desk',
            label: 'Study / Work Desk',
            zone: DirectionEnum.SOUTH_WEST,
            relativePosition: { x: 0.4, y: 0.6 },
            confidence: 0.91,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.length).toBeGreaterThan(0);
      const finding = result.findings.find(
        (f) => f.ruleCode === 'OFF-005-DESK-SW-COMPLIANT',
      );
      expect(finding).toBeDefined();
      expect(finding?.verdict).toBe(VerdictEnum.COMPLIANT);
    });

    it('should evaluate YOLO detected "refrigerator" in North-East for KITCHEN as defect', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.KITCHEN,
        detectedObjects: [
          {
            objectType: 'refrigerator',
            label: 'Refrigerator',
            zone: DirectionEnum.NORTH_EAST,
            relativePosition: { x: 0.8, y: 0.4 },
            confidence: 0.89,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.length).toBeGreaterThan(0);
      const finding = result.findings.find(
        (f) => f.ruleCode === 'KIT-014-FRIDGE-NE-DEFECT',
      );
      expect(finding).toBeDefined();
      expect(finding?.verdict).toBe(VerdictEnum.DEFECT);
    });

    it('should trigger safety net GEN-SPATIAL-HARMONY when detected fixtures have no specific defect', () => {
      const context: EvaluationContext = {
        roomType: RoomTypeEnum.LIVING_ROOM,
        detectedObjects: [
          {
            objectType: 'decorative_item',
            label: 'Vase',
            zone: DirectionEnum.EAST,
            relativePosition: { x: 0.5, y: 0.5 },
            confidence: 0.75,
            attributes: {},
          },
        ],
      };

      const result = engine.evaluate(context);
      expect(result.findings.length).toBeGreaterThan(0);
      const finding = result.findings.find(
        (f) => f.ruleCode === 'GEN-SPATIAL-HARMONY',
      );
      expect(finding).toBeDefined();
      expect(finding?.verdict).toBe(VerdictEnum.COMPLIANT);
    });
  });
});
