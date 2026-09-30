/**
 * OpenAPI 3.1 description of the HTTP surface. Consumed by Scalar at /docs
 * (and available raw at /openapi.json). Kept as a plain document so the
 * presentation layer stays free of codegen tooling.
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "support-api",
    version: "1.0.0",
    description:
      "Order / product / returns REST API. Protected routes require the `x-api-key` header.",
  },
  servers: [{ url: "http://localhost:3000", description: "Local development" }],
  tags: [
    { name: "Health", description: "Liveness and observability (no auth)" },
    { name: "Products", description: "Product catalog CRUD" },
    { name: "Orders", description: "Order lifecycle and returns" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "Matches the `API_KEY` env var (default local value: `local-dev-secret-key`).",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", examples: ["VALIDATION_ERROR", "NOT_FOUND", "UNAUTHORIZED"] },
              message: { type: "string" },
              details: {},
            },
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          sku: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          price: { type: "number" },
          stock: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProduct: {
        type: "object",
        required: ["sku", "name", "price", "stock"],
        properties: {
          sku: { type: "string", minLength: 1, maxLength: 64 },
          name: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 2000 },
          price: { type: "number", minimum: 0 },
          stock: { type: "integer", minimum: 0 },
        },
      },
      UpdateProduct: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: ["string", "null"], maxLength: 2000 },
          price: { type: "number", minimum: 0 },
          stock: { type: "integer", minimum: 0 },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          productId: { type: "string", format: "uuid" },
          quantity: { type: "integer" },
          unitPrice: { type: "number" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customerName: { type: "string" },
          customerEmail: { type: "string", format: "email" },
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "RETURN_REQUESTED", "CANCELLED", "COMPLETED"],
          },
          items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateOrder: {
        type: "object",
        required: ["customerName", "customerEmail", "items"],
        properties: {
          customerName: { type: "string", minLength: 1, maxLength: 200 },
          customerEmail: { type: "string", format: "email" },
          items: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["productId", "quantity"],
              properties: {
                productId: { type: "string", format: "uuid" },
                quantity: { type: "integer", minimum: 1 },
              },
            },
          },
        },
      },
      InitiateReturn: {
        type: "object",
        properties: {
          reason: { type: "string", maxLength: 500 },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          total: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness + DB check",
        security: [],
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", examples: ["ok"] },
                    timestamp: { type: "string", format: "date-time" },
                    dependencies: {
                      type: "object",
                      properties: {
                        database: { type: "string", enum: ["up", "down", "n/a"] },
                      },
                    },
                  },
                },
              },
            },
          },
          "503": { description: "Database unreachable" },
        },
      },
    },
    "/metrics": {
      get: {
        tags: ["Health"],
        summary: "Prometheus metrics",
        security: [],
        responses: {
          "200": {
            description: "Prometheus exposition format",
            content: { "text/plain": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          "200": {
            description: "Paginated product list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          "401": { description: "Missing/invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create a product",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProduct" } } },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Product" } },
                },
              },
            },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/products/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        tags: ["Products"],
        summary: "Get a product",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Product",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Product" } },
                },
              },
            },
          },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        tags: ["Products"],
        summary: "Update a product (partial)",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProduct" } } },
        },
        responses: {
          "204": { description: "Updated" },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Delete a product",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "204": { description: "Deleted" },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["PENDING", "CONFIRMED", "RETURN_REQUESTED", "CANCELLED", "COMPLETED"],
            },
          },
          { name: "customerEmail", in: "query", schema: { type: "string", format: "email" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          "200": {
            description: "Paginated order list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Order" } },
                    meta: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Create an order",
        description: "Validates stock, decrements inventory, and sends a confirmation email stub.",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrder" } } },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Order" } },
                },
              },
            },
          },
          "400": { description: "Validation / business rule error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        tags: ["Orders"],
        summary: "Get an order",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Order",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Order" } },
                },
              },
            },
          },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders/{id}/status": {
      get: {
        tags: ["Orders"],
        summary: "Get an order's status only",
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        status: {
                          type: "string",
                          enum: ["PENDING", "CONFIRMED", "RETURN_REQUESTED", "CANCELLED", "COMPLETED"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders/{id}/returns": {
      post: {
        tags: ["Orders"],
        summary: "Initiate a return",
        description: "Only allowed when the order status is `CONFIRMED`.",
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InitiateReturn" } } },
        },
        responses: {
          "200": {
            description: "Return initiated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Order" } },
                },
              },
            },
          },
          "400": { description: "Business rule violation", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel an order",
        security: [{ ApiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Cancelled",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Order" } },
                },
              },
            },
          },
          "400": { description: "Business rule violation", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
} as const;
