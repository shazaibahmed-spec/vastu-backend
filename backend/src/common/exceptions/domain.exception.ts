import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class DomainException extends HttpException {
  abstract readonly errorCode: string;

  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}

export class AnalysisNotFoundException extends DomainException {
  readonly errorCode = 'ANALYSIS_NOT_FOUND';

  constructor(analysisId: string) {
    super(`Analysis with ID '${analysisId}' was not found.`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidDirectionException extends DomainException {
  readonly errorCode = 'INVALID_DIRECTION_INPUT';

  constructor(message = 'Invalid compass heading or direction input.') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class UnsupportedImageFormatException extends DomainException {
  readonly errorCode = 'UNSUPPORTED_IMAGE_FORMAT';

  constructor(detectedMime: string) {
    super(
      `File format '${detectedMime}' is not supported. Please upload JPEG, PNG, WebP, or HEIC.`,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }
}

export class PoorImageQualityException extends DomainException {
  readonly errorCode = 'POOR_IMAGE_QUALITY';

  constructor(reason: string) {
    super(
      `Image quality insufficient for analysis: ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class AiProviderException extends DomainException {
  readonly errorCode = 'AI_PROVIDER_ERROR';

  constructor(provider: string, details: string) {
    super(
      `AI Service error from '${provider}': ${details}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class RuleEvaluationException extends DomainException {
  readonly errorCode = 'RULE_EVALUATION_FAILED';

  constructor(ruleCode: string, details: string) {
    super(
      `Failed evaluating Vastu rule '${ruleCode}': ${details}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class ImageQualityInsufficientException extends DomainException {
  readonly errorCode = 'IMAGE_QUALITY_INSUFFICIENT';
  readonly issues: string[];
  readonly score: number;

  constructor(issues: string[], score: number) {
    super(
      `Image quality insufficient for analysis (score: ${(score * 100).toFixed(0)}%): ${issues.join(', ')}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    this.issues = issues;
    this.score = score;
  }
}

export class VisionAnalysisFailedException extends DomainException {
  readonly errorCode = 'VISION_ANALYSIS_FAILED';

  constructor(reason: string) {
    super(`Vision analysis failed: ${reason}`, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

