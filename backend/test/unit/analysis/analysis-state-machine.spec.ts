import { describe, expect, it } from 'vitest';
import { AnalysisStatusEnum } from '../../../src/common/constants/index.js';
import {
  AnalysisStateMachine,
  InvalidStateTransitionException,
} from '../../../src/modules/analysis/state-machine/analysis-state-machine.js';

describe('Analysis State Machine', () => {
  describe('Happy path transitions', () => {
    it('should permit linear progression from PENDING to COMPLETED', () => {
      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.PENDING,
          AnalysisStatusEnum.IMAGE_UPLOADED,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.IMAGE_UPLOADED,
          AnalysisStatusEnum.AI_ANALYSIS,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.AI_ANALYSIS,
          AnalysisStatusEnum.OBJECT_DETECTION,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.OBJECT_DETECTION,
          AnalysisStatusEnum.RULE_EVALUATION,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.RULE_EVALUATION,
          AnalysisStatusEnum.REPORT_GENERATION,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.REPORT_GENERATION,
          AnalysisStatusEnum.COMPLETED,
        ),
      ).toBe(true);
    });
  });

  describe('Failure & Retry transitions', () => {
    it('should permit transitioning to failure states', () => {
      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.AI_ANALYSIS,
          AnalysisStatusEnum.FAILED_AI_ANALYSIS,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.RULE_EVALUATION,
          AnalysisStatusEnum.FAILED_RULE_EVALUATION,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.REPORT_GENERATION,
          AnalysisStatusEnum.FAILED_REPORT_GENERATION,
        ),
      ).toBe(true);
    });

    it('should permit retrying from retryable failure states', () => {
      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.FAILED_AI_ANALYSIS,
          AnalysisStatusEnum.AI_ANALYSIS,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.FAILED_RULE_EVALUATION,
          AnalysisStatusEnum.RULE_EVALUATION,
        ),
      ).toBe(true);

      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.FAILED_REPORT_GENERATION,
          AnalysisStatusEnum.REPORT_GENERATION,
        ),
      ).toBe(true);
    });

    it('should accurately identify retryable states', () => {
      expect(
        AnalysisStateMachine.isRetryable(AnalysisStatusEnum.FAILED_AI_ANALYSIS),
      ).toBe(true);
      expect(
        AnalysisStateMachine.isRetryable(
          AnalysisStatusEnum.FAILED_REPORT_GENERATION,
        ),
      ).toBe(true);
      expect(
        AnalysisStateMachine.isRetryable(AnalysisStatusEnum.COMPLETED),
      ).toBe(false);
      expect(
        AnalysisStateMachine.isRetryable(AnalysisStatusEnum.PENDING),
      ).toBe(false);
    });
  });

  describe('Invalid state transitions', () => {
    it('should forbid skipping phases and throw InvalidStateTransitionException', () => {
      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.PENDING,
          AnalysisStatusEnum.COMPLETED,
        ),
      ).toBe(false);

      expect(() => {
        AnalysisStateMachine.assertValidTransition(
          AnalysisStatusEnum.PENDING,
          AnalysisStatusEnum.COMPLETED,
        );
      }).toThrow(InvalidStateTransitionException);
    });

    it('should forbid transitions out of COMPLETED terminal state', () => {
      expect(
        AnalysisStateMachine.canTransition(
          AnalysisStatusEnum.COMPLETED,
          AnalysisStatusEnum.PENDING,
        ),
      ).toBe(false);

      expect(() => {
        AnalysisStateMachine.assertValidTransition(
          AnalysisStatusEnum.COMPLETED,
          AnalysisStatusEnum.RULE_EVALUATION,
        );
      }).toThrow(InvalidStateTransitionException);
    });
  });
});
