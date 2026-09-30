import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Express 4 does not forward rejected promises from async route handlers to
 * the error middleware on its own — without this, a thrown AppError inside
 * an `async (req, res) => {...}` handler would crash the process instead of
 * producing a clean JSON error response.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
