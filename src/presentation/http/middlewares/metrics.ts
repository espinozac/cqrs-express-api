import { Request, Response, NextFunction } from "express";
import { Metrics } from "../../../infrastructure/observability/Metrics";

/** Records request duration/count in Prometheus histograms/counters, labeled by route (not raw path, to avoid cardinality blowup from path params). */
export function metricsMiddleware(metrics: Metrics) {
  return (req: Request, res: Response, next: NextFunction) => {
    const stopTimer = metrics.httpRequestDuration.startTimer();

    res.on("finish", () => {
      const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      stopTimer(labels);
      metrics.httpRequestsTotal.inc(labels);
    });

    next();
  };
}
