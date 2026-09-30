import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { ILogger } from "../../../application/ports/ILogger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      log: ILogger;
      startedAt: bigint;
    }
  }
}

/**
 * Observability building block: assigns/propagates a correlation id
 * (`x-request-id`), attaches a request-scoped child logger (`req.log`) that
 * every downstream middleware/controller uses so every log line for a
 * request can be traced together, and logs request start/finish with
 * latency and status code.
 */
export function requestContext(baseLogger: ILogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.header("x-request-id") || randomUUID()).toString();
    req.id = requestId;
    req.startedAt = process.hrtime.bigint();
    req.log = baseLogger.child({ requestId, method: req.method, path: req.originalUrl });

    res.setHeader("x-request-id", requestId);
    req.log.info("Request received");

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1_000_000;
      req.log.info("Request completed", {
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
}
