import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { AppContainer } from "../../container/container";
import { Cradle } from "../../container/types";
import { requestContext } from "./middlewares/requestContext";
import { apiKeyAuth } from "./middlewares/auth";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { metricsMiddleware } from "./middlewares/metrics";
import { healthRoutes, metricsRoutes } from "./routes/health.routes";
import { docsRoutes } from "./routes/docs.routes";
import { productRoutes } from "./routes/product.routes";
import { orderRoutes } from "./routes/order.routes";
import { ProductController } from "./controllers/ProductController";
import { OrderController } from "./controllers/OrderController";

export function createApp(container: AppContainer): Express {
  const cradle = container.cradle as Cradle;
  const app = express();

  app.disable("x-powered-by");
  // Scalar loads its UI from jsDelivr; loosen CSP just enough for /docs.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
          "style-src": ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "https://cdn.jsdelivr.net"],
          "font-src": ["'self'", "https://cdn.jsdelivr.net", "data:"],
          "connect-src": ["'self'", "https://cdn.jsdelivr.net"],
        },
      },
    }),
  );
  app.use(cors());

  // Accepts JSON bodies and classic form/querystring-encoded bodies alike,
  // per the "payloads should be JSON or query strings" requirement.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestContext(cradle.logger));
  app.use(metricsMiddleware(cradle.metrics));

  // Public endpoints — no API key required (health checks & metrics scrapers can't supply one).
  app.use(healthRoutes(cradle.prisma));
  app.use(metricsRoutes(cradle.metrics));
  app.use(docsRoutes());

  // Everything under /api requires a valid API key.
  app.use("/api", apiKeyAuth(cradle.config));

  const productController = container.resolve<ProductController>("productController");
  const orderController = container.resolve<OrderController>("orderController");

  app.use("/api/products", productRoutes(productController));
  app.use("/api/orders", orderRoutes(orderController));

  app.use(notFoundHandler);
  app.use(errorHandler(cradle.logger)); // must be registered last

  return app;
}
