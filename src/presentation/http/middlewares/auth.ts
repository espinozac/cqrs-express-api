import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../../domain/errors/AppError";
import { AppConfig } from "../../../infrastructure/config/env";

/**
 * Minimal API-key authentication: every protected request must send
 * `x-api-key: <API_KEY>`. This is intentionally simple ("the basics") —
 * swap it for JWT/OAuth2 middleware later without touching any controller,
 * since auth lives entirely at the edge of the presentation layer.
 */
export function apiKeyAuth(config: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const provided = req.header("x-api-key");
    if (!provided || provided !== config.API_KEY) {
      next(new UnauthorizedError("Invalid or missing API key. Send it in the 'x-api-key' header."));
      return;
    }
    next();
  };
}
