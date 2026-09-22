import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception.js';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-request-id'] as string) ||
      (request as any).correlationId ||
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage: string | object = 'An unexpected server error occurred.';
    let errorType = 'Internal Server Error';

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      errorCode = exception.errorCode;
      errorMessage = exception.message;
      errorType = exception.name;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorType = exception.name;
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        errorMessage = body.message || exception.message;
        errorCode = body.error || exception.name;
      } else {
        errorMessage = res;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      this.logger.error(
        `Unhandled exception [${correlationId}]: ${exception.message}`,
        exception.stack,
      );
    }

    const payload = {
      success: false,
      statusCode: status,
      error: errorType,
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    response.status(status).json(payload);
  }
}
