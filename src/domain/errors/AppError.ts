/**
 * Base class for all errors the domain/application layers raise on purpose.
 * The HTTP layer (presentation/http/middlewares/errorHandler.ts) maps these
 * to status codes by `statusCode`, so inner layers never import Express or
 * know anything about HTTP.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";

  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found`);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Missing or invalid credentials") {
    super(message);
  }
}

export class BusinessRuleError extends AppError {
  readonly statusCode = 422;
  readonly code = "BUSINESS_RULE_VIOLATION";

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
