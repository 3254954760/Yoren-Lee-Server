import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException, BizErrorCode, HttpToBizCode } from '../exceptions/business.exception';
import { ErrorResponse } from '../interfaces/response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let httpStatus: number;
    let body: ErrorResponse;

    if (exception instanceof BusinessException) {
      httpStatus = exception.getStatus();
      body = {
        code: exception.getBizCode(),
        errorMsg: {
          message: exception.message,
          detail: exception.getDetail(),
        },
      };
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const isValidation =
        httpStatus === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse;

      if (isValidation) {
        const res = exceptionResponse as Record<string, any>;
        body = {
          code: BizErrorCode.PARAM_INVALID,
          errorMsg: {
            message: '参数校验失败',
            detail: res.message,
          },
        };
      } else {
        body = {
          code: HttpToBizCode[httpStatus] ?? httpStatus,
          errorMsg: {
            message:
              typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any)?.message ?? '请求失败',
          },
        };
      }
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        code: BizErrorCode.INTERNAL_ERROR,
        errorMsg: {
          message: '服务器内部错误',
        },
      };
      this.logger.error('Unhandled exception', exception);
    }

    response.status(httpStatus).json(body);
  }
}
