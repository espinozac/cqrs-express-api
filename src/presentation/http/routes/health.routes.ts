import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Metrics } from "../../../infrastructure/observability/Metrics";

/** Liveness/readiness probe. Deliberately unauthenticated — load balancers and orchestrators hit this without an API key. */
export function healthRoutes(prisma: PrismaClient | undefined): Router {
  const router = Router();

  router.get("/health", async (_req: Request, res: Response) => {
    let dbStatus: "up" | "down" | "n/a" = "n/a";
    if (prisma) {
      dbStatus = "up";
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        dbStatus = "down";
      }
    }

    const status = dbStatus === "down" ? 503 : 200;
    res.status(status).json({
      status: dbStatus === "down" ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
      dependencies: { database: dbStatus },
    });
  });

  return router;
}

/** Prometheus scrape endpoint. Also unauthenticated, matching standard scrape-target conventions. */
export function metricsRoutes(metrics: Metrics): Router {
  const router = Router();

  router.get("/metrics", async (_req: Request, res: Response) => {
    const { contentType, body } = await metrics.expose();
    res.setHeader("Content-Type", contentType);
    res.status(200).send(body);
  });

  return router;
}
