import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'An unexpected error occurred';
    let errorCode = this.getErrorCode(status);
    let details: Array<{ field?: string; issue: string }> = [];

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, any>;
      
      if (respObj.message) {
        if (Array.isArray(respObj.message)) {
          message = 'Validation failed / Resource constraint error';
          errorCode = 'INVALID_INPUT';
          details = respObj.message.map((msg: any) => {
            if (typeof msg === 'string') {
              // Extract field for "property <name> should not exist"
              const unwhitelistedMatch = msg.match(/^property\s+([a-zA-Z0-9_]+)\s+should not exist/i);
              if (unwhitelistedMatch) {
                return {
                  field: unwhitelistedMatch[1],
                  issue: `Field '${unwhitelistedMatch[1]}' is unexpected and not recognized by endpoint [${request.method}] ${request.url}`,
                };
              }

              // Extract field for standard class-validator errors (e.g., "name should not be empty")
              const words = msg.split(' ');
              const firstWord = words[0];
              const isGeneric = ['invalid', 'an', 'the', 'property', 'each'].includes(firstWord.toLowerCase());

              return {
                field: !isGeneric ? firstWord : undefined,
                issue: msg,
              };
            }
            return {
              issue: typeof msg === 'object' ? JSON.stringify(msg) : String(msg),
            };
          });
        } else {
          message = respObj.message;
        }
      }

      if (respObj.code) {
        errorCode = respObj.code;
      }
      if (respObj.details && Array.isArray(respObj.details)) {
        details = respObj.details;
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status}: ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      message,
      error: {
        code: errorCode,
        details: details.length > 0 ? details : [{ issue: message }],
      },
    });
  }


  private getErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'INVALID_INPUT';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
