import { HttpException, HttpStatus } from '@nestjs/common';

export const BizErrorCode = {
  PARAM_INVALID: 10001,
  AUTH_FAILED: 20001,
  FORBIDDEN: 20002,
  NOT_FOUND: 30001,
  INTERNAL_ERROR: 50001,
} as const;

/** HTTP 状态码 → 业务错误码映射 */
export const HttpToBizCode: Record<number, number> = {
  [HttpStatus.BAD_REQUEST]: BizErrorCode.PARAM_INVALID,
  [HttpStatus.UNAUTHORIZED]: BizErrorCode.AUTH_FAILED,
  [HttpStatus.FORBIDDEN]: BizErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: BizErrorCode.NOT_FOUND,
  [HttpStatus.INTERNAL_SERVER_ERROR]: BizErrorCode.INTERNAL_ERROR,
};

export class BusinessException extends HttpException {
  private readonly bizCode: number;
  private readonly detail?: any;

  constructor(
    bizCode: number,
    message: string,
    detail?: any,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ bizCode, message, detail }, httpStatus);
    this.bizCode = bizCode;
    this.detail = detail;
  }

  getBizCode(): number {
    return this.bizCode;
  }

  getDetail(): any {
    return this.detail;
  }
}
