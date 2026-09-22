import {
  EvaluatedObjectFact,
  EvaluationContext,
} from '../types/evaluation-context.js';
import {
  DistanceCondition,
  ExistenceCondition,
  FieldCondition,
  LogicalCondition,
  RuleCondition,
} from '../types/rule-condition.type.js';

export class VastuConditionEvaluator {
  /**
   * Evaluates an AST condition against a specific detected object and overall context.
   */
  static evaluate(
    condition: RuleCondition,
    targetObject: EvaluatedObjectFact | undefined,
    allObjects: EvaluatedObjectFact[],
    context: EvaluationContext,
  ): boolean {
    switch (condition.op) {
      case 'EQUALS':
      case 'NOT_EQUALS':
      case 'IN':
      case 'NOT_IN':
      case 'GREATER_THAN':
      case 'LESS_THAN':
        return this.evaluateFieldCondition(
          condition as FieldCondition,
          targetObject,
          context,
        );

      case 'DISTANCE_LESS_THAN':
        return this.evaluateDistanceCondition(
          condition as DistanceCondition,
          targetObject,
          allObjects,
        );

      case 'EXISTS':
      case 'NOT_EXISTS':
        return this.evaluateExistenceCondition(
          condition as ExistenceCondition,
          allObjects,
        );

      case 'AND': {
        const logical = condition as LogicalCondition;
        if (!logical.conditions || logical.conditions.length === 0) return true;
        return logical.conditions.every((c) =>
          this.evaluate(c, targetObject, allObjects, context),
        );
      }

      case 'OR': {
        const logical = condition as LogicalCondition;
        if (!logical.conditions || logical.conditions.length === 0) return false;
        return logical.conditions.some((c) =>
          this.evaluate(c, targetObject, allObjects, context),
        );
      }

      default:
        return false;
    }
  }

  private static evaluateFieldCondition(
    condition: FieldCondition,
    targetObject: EvaluatedObjectFact | undefined,
    context: EvaluationContext,
  ): boolean {
    // Attempt resolving from targetObject first, then fallback to context
    let fieldValue = this.resolveField(targetObject, condition.field);
    if (fieldValue === undefined) {
      fieldValue = this.resolveField(context, condition.field);
    }

    switch (condition.op) {
      case 'EQUALS':
        return fieldValue === condition.value;

      case 'NOT_EQUALS':
        return fieldValue !== condition.value;

      case 'IN':
        return (
          Array.isArray(condition.value) && condition.value.includes(fieldValue)
        );

      case 'NOT_IN':
        return (
          Array.isArray(condition.value) &&
          !condition.value.includes(fieldValue)
        );

      case 'GREATER_THAN':
        return typeof fieldValue === 'number' && fieldValue > condition.value;

      case 'LESS_THAN':
        return typeof fieldValue === 'number' && fieldValue < condition.value;

      default:
        return false;
    }
  }

  private static evaluateDistanceCondition(
    condition: DistanceCondition,
    sourceObject: EvaluatedObjectFact | undefined,
    allObjects: EvaluatedObjectFact[],
  ): boolean {
    if (!sourceObject || !sourceObject.relativePosition) {
      return false;
    }

    const targetKey = condition.targetObject.toLowerCase();
    const otherObject = allObjects.find(
      (obj) => {
        if (obj === sourceObject) return false;
        const objType = obj.objectType.toLowerCase();
        if (objType === targetKey) return true;
        if (targetKey === 'sink' && (objType === 'kitchen_sink' || objType === 'washbasin')) return true;
        if (targetKey === 'gas_stove' && (objType === 'stove' || objType === 'oven' || objType === 'cooking_range')) return true;
        return false;
      },
    );

    if (!otherObject || !otherObject.relativePosition) {
      return false;
    }

    // Normalized Euclidean distance (0.0 to ~1.41)
    const dx = sourceObject.relativePosition.x - otherObject.relativePosition.x;
    const dy = sourceObject.relativePosition.y - otherObject.relativePosition.y;
    const normalizedDistance = Math.sqrt(dx * dx + dy * dy);

    // Standard residential room assumed at approx 4.0 meters on average side
    const estimatedDistanceMeters = normalizedDistance * 4.0;

    return estimatedDistanceMeters < condition.maxMeters;
  }

  private static evaluateExistenceCondition(
    condition: ExistenceCondition,
    allObjects: EvaluatedObjectFact[],
  ): boolean {
    const exists = allObjects.some(
      (obj) =>
        obj.objectType.toLowerCase() === condition.targetObject.toLowerCase(),
    );

    return condition.op === 'EXISTS' ? exists : !exists;
  }

  private static resolveField(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        break;
      }
      current = current[part];
    }

    if (current !== undefined && current !== null) {
      return current;
    }

    // Attribute aliases fallback for directional attributes
    if (obj && typeof obj === 'object') {
      const attrs = obj.attributes || obj;
      if (path === 'attributes.headboardDirection') {
        return attrs.headboardOrientation ?? attrs.headboardDirection;
      }
      if (path === 'attributes.headboardOrientation') {
        return attrs.headboardDirection ?? attrs.headboardOrientation;
      }
      if (path === 'attributes.facingDirection') {
        return (
          attrs.facingDirection ??
          attrs.headboardDirection ??
          attrs.headboardOrientation ??
          attrs.orientation
        );
      }
    }

    return undefined;
  }
}
