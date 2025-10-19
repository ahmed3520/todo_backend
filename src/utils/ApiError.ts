interface ApiErrorParams {
  message: string;
  statusCode: number;
  details?: unknown;
  isOperational?: boolean;
}

export class ApiError extends Error {
  public readonly statusCode: number;

  public readonly isOperational: boolean;

  public readonly details?: unknown;

  constructor({ message, statusCode, details, isOperational = true }: ApiErrorParams) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
