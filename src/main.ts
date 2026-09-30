import "dotenv/config";
import { buildContainer } from "./container/container";
import { Cradle } from "./container/types";
import { createApp } from "./presentation/http/app";

/** Composition root: the one place that wires config -> container -> HTTP server. */
async function bootstrap(): Promise<void> {
  const container = buildContainer();
  const cradle = container.cradle as Cradle;

  // Fail fast if the database is unreachable rather than accepting traffic that can never succeed.
  await cradle.prisma?.$connect();

  const app = createApp(container);

  const server = app.listen(cradle.config.PORT, () => {
    cradle.logger.info(`support-api listening on port ${cradle.config.PORT}`, {
      env: cradle.config.NODE_ENV,
    });
  });

  const shutdown = (signal: string) => {
    cradle.logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await cradle.prisma?.$disconnect();
      await container.dispose();
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs (e.g. a stuck connection).
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    cradle.logger.error("Unhandled promise rejection", reason);
  });
  process.on("uncaughtException", (error) => {
    cradle.logger.error("Uncaught exception — exiting", error);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
