export interface ApiResponse<TData = unknown> {
  success: boolean;
  message: string;
  data?: TData;
  meta?: Record<string, unknown>;
}

export function successResponse<TData>(options: {
  data?: TData;
  message?: string;
  meta?: Record<string, unknown>;
}): ApiResponse<TData> {
  const { data, message = 'OK', meta } = options;

  return {
    success: true,
    message,
    data,
    meta,
  };
}

export function errorResponse(options: {
  message: string;
  meta?: Record<string, unknown>;
}): ApiResponse {
  const { message, meta } = options;

  return {
    success: false,
    message,
    meta,
  };
}
