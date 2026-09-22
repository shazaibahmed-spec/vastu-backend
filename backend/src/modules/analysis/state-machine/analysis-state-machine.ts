import { AnalysisStatusEnum } from '../../../common/constants/index.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { HttpStatus } from '@nestjs/common';

export class InvalidStateTransitionException extends DomainException {
  readonly errorCode = 'INVALID_STATE_TRANSITION';

  constructor(from: AnalysisStatusEnum, to: AnalysisStatusEnum) {
    super(
      `Illegal analysis state transition from '${from}' to '${to}'.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class AnalysisStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<
    AnalysisStatusEnum,
    ReadonlySet<AnalysisStatusEnum>
  > = {
    [AnalysisStatusEnum.PENDING]: new Set([
      AnalysisStatusEnum.IMAGE_UPLOADED,
      AnalysisStatusEnum.FAILED_INVALID_INPUT,
    ]),

    [AnalysisStatusEnum.IMAGE_UPLOADED]: new Set([
      AnalysisStatusEnum.AI_ANALYSIS,
      AnalysisStatusEnum.FAILED_AI_ANALYSIS,
    ]),

    [AnalysisStatusEnum.AI_ANALYSIS]: new Set([
      AnalysisStatusEnum.OBJECT_DETECTION,
      AnalysisStatusEnum.FAILED_AI_ANALYSIS,
    ]),

    [AnalysisStatusEnum.OBJECT_DETECTION]: new Set([
      AnalysisStatusEnum.RULE_EVALUATION,
      AnalysisStatusEnum.FAILED_RULE_EVALUATION,
    ]),

    [AnalysisStatusEnum.RULE_EVALUATION]: new Set([
      AnalysisStatusEnum.REPORT_GENERATION,
      AnalysisStatusEnum.FAILED_RULE_EVALUATION,
    ]),

    [AnalysisStatusEnum.REPORT_GENERATION]: new Set([
      AnalysisStatusEnum.COMPLETED,
      AnalysisStatusEnum.FAILED_REPORT_GENERATION,
    ]),

    // Failure states that are retryable
    [AnalysisStatusEnum.FAILED_AI_ANALYSIS]: new Set([
      AnalysisStatusEnum.AI_ANALYSIS,
    ]),

    [AnalysisStatusEnum.FAILED_RULE_EVALUATION]: new Set([
      AnalysisStatusEnum.RULE_EVALUATION,
    ]),

    [AnalysisStatusEnum.FAILED_REPORT_GENERATION]: new Set([
      AnalysisStatusEnum.REPORT_GENERATION,
    ]),

    // Terminal states
    [AnalysisStatusEnum.FAILED_INVALID_INPUT]: new Set([]),
    [AnalysisStatusEnum.COMPLETED]: new Set([]),
  };

  /**
   * Checks if a transition from currentState to targetState is valid.
   */
  static canTransition(
    current: AnalysisStatusEnum,
    target: AnalysisStatusEnum,
  ): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[current];
    return allowed ? allowed.has(target) : false;
  }

  /**
   * Validates and asserts that a transition is legal; throws InvalidStateTransitionException if not.
   */
  static assertValidTransition(
    current: AnalysisStatusEnum,
    target: AnalysisStatusEnum,
  ): void {
    if (!this.canTransition(current, target)) {
      throw new InvalidStateTransitionException(current, target);
    }
  }

  /**
   * Determines if a status is a retryable failure state.
   */
  static isRetryable(status: AnalysisStatusEnum): boolean {
    return (
      status === AnalysisStatusEnum.FAILED_AI_ANALYSIS ||
      status === AnalysisStatusEnum.FAILED_RULE_EVALUATION ||
      status === AnalysisStatusEnum.FAILED_REPORT_GENERATION
    );
  }
}
