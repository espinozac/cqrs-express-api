import pino, { Logger as PinoInstance } from "pino";
import { ILogger } from "../../application/ports/ILogger";
import { AppConfig } from "../config/env";

/**
 * Adapter implementing the application's ILogger port with pino: fast,
 * structured (JSON) logging suitable for shipping to any log aggregator
 * (CloudWatch, Datadog, ELK, ...). In development it pretty-prints instead.
 */
export class PinoLogger implements ILogger {
  private readonly pino: PinoInstance;

  constructor(config: AppConfig, pinoInstance?: PinoInstance) {
    this.pino =
      pinoInstance ??
      pino({
        level: config.LOG_LEVEL,
        base: { service: "support-api" },
        transport:
          config.NODE_ENV === "development"
            ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l" } }
            : undefined,
      });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.pino.debug(context ?? {}, message);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.pino.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.pino.warn(context ?? {}, message);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errPayload =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : error;
    this.pino.error({ ...context, err: errPayload }, message);
  }

  child(context: Record<string, unknown>): ILogger {
    return new PinoLogger({} as AppConfig, this.pino.child(context));
  }
}
