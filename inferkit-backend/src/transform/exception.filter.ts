import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx    = host.switchToHttp();
    const res    = ctx.getResponse<Response>();
    const req    = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? (() => {
          const r = exception.getResponse();
          return typeof r === 'string' ? r : (r as { message?: string }).message ?? 'Error';
        })()
      : 'Internal server error';

    res.status(status).json({
      success:   false,
      error:     { statusCode: status, message, path: req.url },
      ts:        new Date().toISOString(),
    });
  }
}