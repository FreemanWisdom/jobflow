import "server-only";

export type AppErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "DATABASE_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export function toDatabaseError(operation: string, error: unknown): AppError {
  console.error(`JobFlow database error during ${operation}`, error);
  return new AppError("DATABASE_ERROR", "The requested database operation could not be completed.", {
    cause: error,
  });
}
