export interface SuccessResponse<T = any> {
  code: 0;
  data: T;
}

export interface ErrorResponse {
  code: number;
  errorMsg: {
    message: string;
    detail?: any;
  };
}
