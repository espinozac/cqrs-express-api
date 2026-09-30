import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";
import { ValidationError } from "../../../domain/errors/AppError";

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Payload validation middleware. Works for JSON bodies, querystring params,
 * and route params alike — all are just objects Zod can parse, coercing
 * strings (querystrings are always strings) into numbers/enums/etc as the
 * schema declares. On failure, raises a single ValidationError (400) with
 * the field-level Zod issues attached, rather than a generic message.
 */
export function validate(schemas: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError("Payload validation failed", error.flatten()));
        return;
      }
      next(error);
    }
  };
}
