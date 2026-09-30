import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

const API_KEY = "test-api-key";

beforeAll(() => {
  process.env.DATABASE_URL = "file:./test-scratch.db";
  process.env.API_KEY = API_KEY;
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  // Exercises the whole stack (routing, auth, validation, CQRS, error handling,
  // observability) against the in-memory repository adapter, so the test suite
  // needs neither a running database nor Prisma's generated query engine.
  // The PrismaProductRepository/PrismaOrderRepository adapters are exercised by
  // wiring PERSISTENCE_DRIVER=prisma after `npx prisma generate` (see README).
  process.env.PERSISTENCE_DRIVER = "memory";
});

describe("support-api", () => {
  let app: Express;

  beforeAll(async () => {
    // Imported lazily so env vars above are in place before config validation runs.
    const { buildContainer } = await import("../src/container/container");
    const { createApp } = await import("../src/presentation/http/app");
    app = createApp(buildContainer());
  });

  it("GET /health reports ok without authentication", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("rejects requests to /api without an API key", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid payloads with a structured 400", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("x-api-key", API_KEY)
      .send({ sku: "", name: "", price: -1, stock: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown product id", async () => {
    const res = await request(app)
      .get("/api/products/11111111-1111-1111-1111-111111111111")
      .set("x-api-key", API_KEY);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("supports full CRUD + pagination via query string", async () => {
    const created = await request(app)
      .post("/api/products")
      .set("x-api-key", API_KEY)
      .send({ sku: "TEST-WIDGET", name: "Test Widget", price: 10, stock: 5 });
    expect(created.status).toBe(201);
    const productId = created.body.data.id;

    const fetched = await request(app).get(`/api/products/${productId}`).set("x-api-key", API_KEY);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.sku).toBe("TEST-WIDGET");

    // Query-string payload: pagination + search.
    const listed = await request(app)
      .get("/api/products?page=1&pageSize=10&search=Test")
      .set("x-api-key", API_KEY);
    expect(listed.status).toBe(200);
    expect(listed.body.meta).toMatchObject({ page: 1, pageSize: 10 });
    expect(listed.body.data.some((p: { id: string }) => p.id === productId)).toBe(true);

    const patched = await request(app)
      .patch(`/api/products/${productId}`)
      .set("x-api-key", API_KEY)
      .send({ stock: 3 });
    expect(patched.status).toBe(204);

    const refetched = await request(app).get(`/api/products/${productId}`).set("x-api-key", API_KEY);
    expect(refetched.body.data.stock).toBe(3);

    const deleted = await request(app).delete(`/api/products/${productId}`).set("x-api-key", API_KEY);
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app).get(`/api/products/${productId}`).set("x-api-key", API_KEY);
    expect(afterDelete.status).toBe(404);
  });

  it("creates an order (CQRS command) and reads its status (CQRS query)", async () => {
    const product = await request(app)
      .post("/api/products")
      .set("x-api-key", API_KEY)
      .send({ sku: "ORDER-ITEM-1", name: "Orderable Thing", price: 9.5, stock: 10 });
    const productId = product.body.data.id;

    const order = await request(app)
      .post("/api/orders")
      .set("x-api-key", API_KEY)
      .send({
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        items: [{ productId, quantity: 2 }],
      });
    expect(order.status).toBe(201);
    expect(order.body.data.total).toBe(19);
    const orderId = order.body.data.id;

    const status = await request(app).get(`/api/orders/${orderId}/status`).set("x-api-key", API_KEY);
    expect(status.status).toBe(200);
    expect(status.body.data.status).toBe("PENDING");

    // A PENDING order can be cancelled...
    const cancelled = await request(app).post(`/api/orders/${orderId}/cancel`).set("x-api-key", API_KEY);
    expect(cancelled.status).toBe(200);

    // ...but a return cannot be initiated on it directly (business-rule violation -> 422).
    const invalidReturn = await request(app)
      .post(`/api/orders/${orderId}/returns`)
      .set("x-api-key", API_KEY)
      .send({ reason: "test" });
    expect(invalidReturn.status).toBe(422);
    expect(invalidReturn.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("exposes Prometheus-format metrics", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("http_requests_total");
  });
});
