import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '../logger';

/**
 * Global exception filter.
 *
 * Returns a consistent error envelope:
 *   { success: false, message, code, requestId, path, timestamp }
 *
 * In production, internal exception details are never leaked to the caller -
 * they are logged server-side only.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId;
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unable to process request';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
      } else {
        const body = exResponse as any;
        message = typeof body.message === 'string' ? body.message : message;
        if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        }
        code = body.code || 'VALIDATION_ERROR';
        if (body.success === false && body.message) {
          message = body.message;
        }
      }
    } else if (exception instanceof Error) {
      logger.error(
        {
          requestId,
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        },
        'Unhandled exception',
      );
    }

    if (isProduction && status >= 500 && !(exception instanceof HttpException)) {
      message = 'Unable to process request';
    }

    response.status(status).json({
      success: false,
      message,
      code,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
