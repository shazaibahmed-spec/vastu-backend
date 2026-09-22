import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

const SENSITIVE_KEYS = new Set([
  'password',
  'refreshtoken',
  'token',
  'authorization',
  'accesstoken',
  'secret',
  'apikey',
]);

/**
 * Recursively sanitizes request/response objects for secure, clean logging:
 * - Redacts passwords, tokens, API keys
 * - Truncates excessively long strings (e.g. base64, long buffers)
 * - Summarizes Buffer objects
 */
function sanitizeForLogging(data: any, depth = 0): any {
  if (depth > 4) return '[Max Depth]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (data.length > 500) {
      return `${data.substring(0, 100)}... [truncated ${data.length} chars]`;
    }
    return data;
  }

  if (typeof data !== 'object') return data;

  if (Buffer.isBuffer(data)) {
    return `<Buffer length: ${data.length} bytes>`;
  }

  if (Array.isArray(data)) {
    if (data.length > 15) {
      return [
        ...data.slice(0, 15).map((item) => sanitizeForLogging(item, depth + 1)),
        `... [${data.length - 15} more items]`,
      ];
    }
    return data.map((item) => sanitizeForLogging(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = sanitizeForLogging(value, depth + 1);
    }
  }
  return sanitized;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const correlationId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = correlationId;
    (req as any).correlationId = correlationId;
    res.setHeader('x-request-id', correlationId);

    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    const hasQuery = req.query && Object.keys(req.query).length > 0;
    const hasInitialBody =
      req.body &&
      typeof req.body === 'object' &&
      Object.keys(req.body).length > 0;

    const authInfo = (req as any).user?.userId
      ? ` [User: ${(req as any).user.userId}]`
      : req.headers.authorization
        ? ` [Bearer Token Present]`
        : ` [Guest]`;

    let reqLog = `[${correlationId}] 📥 REQUEST  ${method} ${originalUrl} (${ip})${authInfo}`;
    if (hasQuery) {
      reqLog += `\n  Query: ${JSON.stringify(req.query)}`;
    }
    if (hasInitialBody) {
      reqLog += `\n  Body:  ${JSON.stringify(sanitizeForLogging(req.body))}`;
    }

    this.logger.log(reqLog);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          let resLog = `[${correlationId}] 📤 RESPONSE ${method} ${originalUrl} ${statusCode} - ${duration}ms`;

          // If body was parsed by subsequent interceptor (e.g. FileInterceptor for multipart)
          if (
            !hasInitialBody &&
            req.body &&
            typeof req.body === 'object' &&
            Object.keys(req.body).length > 0
          ) {
            resLog += `\n  Req Body: ${JSON.stringify(sanitizeForLogging(req.body))}`;
          }

          // If multipart file was uploaded
          const file = (req as any).file;
          if (file) {
            resLog += `\n  File:     [${file.originalname || 'file'} (${file.mimetype || 'unknown'}, ${(file.size / 1024).toFixed(1)} KB)]`;
          }

          // Response Payload
          if (responseData !== undefined) {
            resLog += `\n  Res Body: ${JSON.stringify(sanitizeForLogging(responseData))}`;
          }

          this.logger.log(resLog);
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const status = err.status || err.statusCode || 500;
          const errorMessage = err.message || 'Unknown error';

          let errLog = `[${correlationId}] ❌ ERROR    ${method} ${originalUrl} ${status} - ${duration}ms\n  Message:  ${errorMessage}`;

          if (err.response) {
            errLog += `\n  Res Body: ${JSON.stringify(sanitizeForLogging(err.response))}`;
          }

          this.logger.warn(errLog);
        },
      }),
    );
  }
}
