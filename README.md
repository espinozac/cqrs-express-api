# support-api

A Node.js + TypeScript REST API scaffold built with Clean Architecture: dependency
injection, CQRS, payload validation, structured logging/metrics, centralized error
handling, and a swappable persistence layer. It models a small order/product/returns
domain (the kind of thing a support workflow or agent would call into), but no AWS
or LLM integration is wired up — this is the plain REST foundation underneath that.

## Architecture

```
src/
  domain/            Entities, invariants, domain errors, repository PORTS (interfaces).
                      Zero framework dependencies — no Express, no Prisma.
  application/        Use cases as CQRS Commands + Queries, each with its own handler.
                      Depends only on domain + its own ports (ILogger, IEmailService).
  infrastructure/      ADAPTERS that implement the ports: Prisma repositories, an
                      in-memory repository, pino logging, prom-client metrics, a
                      console "email service" standing in for a real provider.
  presentation/http/  Express: routes, controllers (thin — no business logic),
                      middlewares (auth, validation, error handling, observability).
  container/          Composition root: a single Awilix DI container wires every
                      class above together. Nothing calls `new` on a dependency
                      directly outside this folder.
```

Dependency direction only ever points inward: `presentation -> application -> domain`,
and `infrastructure` implements interfaces `domain`/`application` define. Swapping
Prisma for another database, or the console email stub for real SES/SendGrid, means
writing one new adapter class — no changes to routes, controllers, or use cases.

### CQRS

Every write is a **Command** (`CreateProductCommand`, `InitiateReturnCommand`, ...) and
every read is a **Query** (`GetProductByIdQuery`, `ListOrdersQuery`, ...), each with its
own handler class and its own bus (`CommandBus` / `QueryBus`, in
`src/application/bus`). Controllers never call a handler directly — they build a
Command/Query object and hand it to the bus, which routes it by a `type` string. This
keeps controllers trivial and makes it easy to later add cross-cutting behavior
(e.g. audit-logging every command) in exactly one place.

### Dependency injection

[Awilix](https://github.com/jeffijoe/awilix) (`src/container/container.ts`) is the
composition root. Every handler, repository, and controller declares its
dependencies as a single constructor argument, destructured — e.g.
`constructor({ productRepository, logger }: Pick<Cradle, "productRepository" | "logger">)`.
That `Pick<...>` is a cheap, honest interface: reading a class's constructor tells you
exactly what it depends on, and `Cradle` (`src/container/types.ts`) is the full map of
what the container can provide.

### Validation

Every route validates its input with [Zod](https://zod.dev) schemas
(`src/presentation/http/schemas`) via a `validate()` middleware — for the JSON body,
the query string, and route params alike. Failures short-circuit into a single
`ValidationError` (HTTP 400) with field-level detail; nothing reaches a controller or
handler unvalidated.

### Error handling

Domain/application code throws typed errors (`NotFoundError`, `ValidationError`,
`ConflictError`, `UnauthorizedError`, `BusinessRuleError` — see
`src/domain/errors/AppError.ts`), each carrying its own HTTP status and machine-readable
`code`. A single Express error-handling middleware
(`src/presentation/http/middlewares/errorHandler.ts`) is the only place that turns
those into HTTP responses; anything unexpected is logged in full but only a generic
500 leaves the process.

### Observability

- **Structured logging** via pino (`src/infrastructure/logging/PinoLogger.ts`),
  pretty-printed in development, JSON in production. Every request gets a
  correlation id (`x-request-id`, generated or propagated) and a child logger
  carrying it, so every log line for one request can be traced together
  (`src/presentation/http/middlewares/requestContext.ts`).
- **Metrics** via prom-client (`src/infrastructure/observability/Metrics.ts`):
  request counts and latency histograms, scraped at `GET /metrics` in standard
  Prometheus exposition format.
- **Health check** at `GET /health`, which also pings the database.

### Authentication

Simple API-key auth: every `/api/*` request must send `x-api-key: <API_KEY>`
(`src/presentation/http/middlewares/auth.ts`). This is deliberately minimal — swap it
for JWT/OAuth2 middleware later without touching a single controller.

### Persistence

Two adapters implement the same repository ports (`src/domain/repositories`):

- **Prisma + SQLite** (`src/infrastructure/persistence/prisma`) — the real, persistent
  adapter. Swapping SQLite for Postgres later is a one-line change to
  `prisma/schema.prisma` plus `DATABASE_URL`.
- **In-memory** (`src/infrastructure/persistence/memory`) — a zero-dependency adapter
  used by the test suite and available for local runs with `PERSISTENCE_DRIVER=memory`
  (no database needed at all).

## Getting started

```bash
npm install
cp .env.example .env

# Generates the Prisma client types + engine, and creates dev.db with the schema.
npx prisma generate
npx prisma migrate dev --name init

# Optional: seed a few sample products
npm run db:seed

npm run dev
```

The API listens on `http://localhost:3000` by default. Every `/api/*` request needs
`x-api-key: local-dev-secret-key` (or whatever you set `API_KEY` to in `.env`).

> **Note on `npx prisma generate`:** this step downloads Prisma's query engine
> binary the first time it runs, so it needs normal outbound internet access. If
> you're running this inside a network-restricted sandbox/CI image that blocks
> `binaries.prisma.sh`, set `PERSISTENCE_DRIVER=memory` in `.env` instead — the API
> runs identically against the in-memory adapter, with the only difference being
> that data doesn't survive a restart. Everything in this repo was built and its
> test suite was run end-to-end against that in-memory adapter for exactly this
> reason; switch back to `PERSISTENCE_DRIVER=prisma` once you're somewhere with
> normal network access and the persistence layer is byte-for-byte the same code.

### Running tests

```bash
npm test
```

The suite (`tests/api.test.ts`) boots the real Express app (with the in-memory
adapter) and drives it through supertest: auth rejection, payload validation errors,
full product CRUD including pagination via query string, an order lifecycle
exercising the CQRS command/query split, a business-rule violation (returning an
order that was never confirmed), and the `/metrics` endpoint.

## API reference

All endpoints below (except `/health` and `/metrics`) require `x-api-key`. Request
bodies accept JSON (`Content-Type: application/json`) or form/querystring-encoded
payloads (`Content-Type: application/x-www-form-urlencoded`); list endpoints accept
their filters as querystring params either way.

| Method | Path                     | Description                                   |
| ------ | ------------------------ | ---------------------------------------------- |
| GET    | `/health`                | Liveness + DB check. No auth required.         |
| GET    | `/metrics`               | Prometheus metrics. No auth required.          |
| POST   | `/api/products`          | Create a product.                              |
| GET    | `/api/products`          | List products (`?search=&page=&pageSize=`).    |
| GET    | `/api/products/:id`      | Get one product.                               |
| PATCH  | `/api/products/:id`      | Update a product (partial).                    |
| DELETE | `/api/products/:id`      | Delete a product.                              |
| POST   | `/api/orders`            | Create an order (validates stock, decrements it, sends a confirmation email). |
| GET    | `/api/orders`            | List orders (`?status=&customerEmail=&page=&pageSize=`). |
| GET    | `/api/orders/:id`        | Get one order.                                 |
| GET    | `/api/orders/:id/status` | Get just an order's status (cheap read).       |
| POST   | `/api/orders/:id/returns`| Initiate a return (only from `CONFIRMED`).     |
| POST   | `/api/orders/:id/cancel` | Cancel an order.                               |

Example:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "x-api-key: local-dev-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"sku": "WIDGET-001", "name": "Standard Widget", "price": 19.99, "stock": 100}'
```

Every response is either `{ "data": ... }` (optionally with `"meta"` for paginated
lists) or `{ "error": { "code": ..., "message": ..., "details": ... } }`.

## Extending this

- **New feature**: add a domain invariant if needed, a Command/Query + handler in
  `application`, a route + controller method + Zod schema in `presentation/http`,
  and register the handler on the bus in `container/container.ts`.
- **Real email provider**: implement `IEmailService`
  (`src/application/ports/IEmailService.ts`) against SES/SendGrid/Postmark, and swap
  the registration in `container.ts` — nothing else changes.
- **Real auth**: replace `apiKeyAuth` with JWT/OAuth2 middleware; controllers are
  unaffected either way.
- **Postgres instead of SQLite**: change the `datasource` block in
  `prisma/schema.prisma` and `DATABASE_URL`; `PrismaProductRepository`/
  `PrismaOrderRepository` don't change.
