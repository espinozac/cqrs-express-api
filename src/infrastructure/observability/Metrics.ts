import client from "prom-client";

/**
 * Thin wrapper around prom-client. Exposes a Prometheus-format /metrics
 * endpoint out of the box — the same shape CloudWatch/Grafana agents scrape
 * in real deployments — without pulling observability concerns into
 * business logic (handlers never import this; only HTTP middleware does).
 */
export class Metrics {
  readonly registry: client.Registry;
  readonly httpRequestDuration: client.Histogram<string>;
  readonly httpRequestsTotal: client.Counter<string>;

  constructor() {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new client.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    });
  }

  async expose(): Promise<{ contentType: string; body: string }> {
    return { contentType: this.registry.contentType, body: await this.registry.metrics() };
  }
}
