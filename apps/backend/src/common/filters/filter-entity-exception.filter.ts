import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityExistsError } from '../errors/entity-exists.error';
import { EntityNotFoundError } from '../errors/entity-not-found.error';
import { EntityError } from '../errors/entity.error';

@Catch()
export class EntityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(EntityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';

    if (exception instanceof EntityError) {
      switch (exception.constructor) {
        case EntityNotFoundError:
          status = HttpStatus.NOT_FOUND;
          break;
        case EntityExistsError:
          status = HttpStatus.CONFLICT;
          break;
      }

      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : ((message as { message?: string | string[] })?.message ?? message),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${JSON.stringify(errorResponse)}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
