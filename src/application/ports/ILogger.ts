/**
 * Application-layer logging port. Use cases and handlers depend on this
 * interface only, so they stay unaware of pino/winston/console — whatever
 * infrastructure/logging wires up. Every method accepts a `context` object
 * so structured fields (requestId, userId, orderId, ...) flow through as
 * real JSON fields rather than string-concatenated messages.
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  /** Returns a logger with `context` pre-bound to every subsequent call (e.g. per-request). */
  child(context: Record<string, unknown>): ILogger;
}
