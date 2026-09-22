export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'DISTANCE_LESS_THAN'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'AND'
  | 'OR';

export interface BaseCondition {
  op: ConditionOperator;
}

export interface FieldCondition extends BaseCondition {
  op: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'LESS_THAN';
  field: string; // e.g. 'zone', 'attributes.headboardDirection', 'relativePosition.x'
  value: any;
}

export interface DistanceCondition extends BaseCondition {
  op: 'DISTANCE_LESS_THAN';
  targetObject: string; // e.g. 'sink' when checking distance from 'gas_stove'
  maxMeters: number;
}

export interface ExistenceCondition extends BaseCondition {
  op: 'EXISTS' | 'NOT_EXISTS';
  targetObject: string;
}

export interface LogicalCondition extends BaseCondition {
  op: 'AND' | 'OR';
  conditions: RuleCondition[];
}

export type RuleCondition =
  | FieldCondition
  | DistanceCondition
  | ExistenceCondition
  | LogicalCondition;
