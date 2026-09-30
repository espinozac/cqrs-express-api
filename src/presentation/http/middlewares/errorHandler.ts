import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../domain/errors/AppError";
import { ILogger } from "../../../application/ports/ILogger";

/**
 * Centralized error handling: every AppError subclass (NotFoundError,
 * ValidationError, ConflictError, UnauthorizedError, BusinessRuleError)
 * carries its own HTTP status and a machine-readable `code`, so this
 * middleware never has to guess. Anything else is an unexpected bug — it
 * gets logged with full detail server-side but only a generic message
 * leaves the process, so internals never leak to clients.
 *
 * Must be registered LAST, after all routes, with 4 parameters — that
 * arity is how Express recognizes an error-handling middleware.
 */
export function errorHandler(fallbackLogger: ILogger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const log = req.log ?? fallbackLogger;

    if (err instanceof AppError) {
      log.warn(`Handled error: ${err.message}`, {
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
      });
      res.status(err.statusCode).json(err.toJSON());
      return;
    }

    log.error("Unhandled error", err);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
  };
}
