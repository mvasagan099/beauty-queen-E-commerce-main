import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { logger } from '../logger';

/**
 * Structured HTTP access logging interceptor.
 *
 * Logs method, URL, request id, status code and duration for every request in
 * a JSON-friendly (pino) format. Containers/production parsers can consume the
 * fields directly for monitoring and correlation via the request id.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request: Request = httpContext.getRequest();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const requestId = (request as any).requestId;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response: Response = httpContext.getResponse();
          const statusCode = response.statusCode;
          const durationMs = Date.now() - startTime;
          logger.info(
            {
              requestId,
              method,
              url,
              statusCode,
              durationMs,
            },
            'http request',
          );
        },
        error: (err: any) => {
          const statusCode = err?.status || 500;
          const durationMs = Date.now() - startTime;
          logger.error(
            {
              requestId,
              method,
              url,
              statusCode,
              durationMs,
            },
            `http request failed: ${err?.message || 'error'}`,
          );
        },
      }),
    );
  }
}
