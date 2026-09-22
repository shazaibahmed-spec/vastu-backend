import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId =
      (request.headers['x-request-id'] as string) ||
      (request as any).correlationId;

    return next.handle().pipe(
      map((data) => {
        // Do not double-wrap if already conforms to envelope or is a buffer / stream
        if (
          data &&
          typeof data === 'object' &&
          ('success' in data || Buffer.isBuffer(data))
        ) {
          return data;
        }

        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId,
          },
        };
      }),
    );
  }
}
