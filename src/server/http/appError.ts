export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      code?: string;
      isOperational?: boolean;
      details?: unknown;
      metadata?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options?.code;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    this.metadata = options?.metadata;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
