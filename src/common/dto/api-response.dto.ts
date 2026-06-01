export class ApiResponseDto<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page?: number; total?: number };

  static ok<T>(data: T, meta?: ApiResponseDto<T>['meta']): ApiResponseDto<T> {
    return { success: true, data, meta };
  }

  static fail(code: string, message: string): ApiResponseDto {
    return { success: false, error: { code, message } };
  }
}
