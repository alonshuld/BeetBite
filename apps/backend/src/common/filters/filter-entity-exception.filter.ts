import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityAlreadyExistsError } from '../errors/entity-already-exists.error';
import { EntityNotFoundError } from '../errors/entity-not-found.error';
import { EntityError } from '../errors/entity.error';
import { isCodedError } from '../errors/coded-error';

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
      if (exception instanceof EntityNotFoundError) {
        status = HttpStatus.NOT_FOUND;
      } else if (exception instanceof EntityAlreadyExistsError) {
        status = HttpStatus.CONFLICT;
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
      // A stable code (plus the values its message needs) lets the client
      // show the error in the user's language; `message` stays English.
      ...(isCodedError(exception) && {
        code: exception.code,
        ...(exception.params && { params: exception.params }),
      }),
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
