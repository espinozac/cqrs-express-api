import { Router, Request, Response } from "express";
import { apiReference } from "@scalar/express-api-reference";
import { openApiDocument } from "../openapi";

/** Public docs: OpenAPI JSON + Scalar UI. No API key required. */
export function docsRoutes(): Router {
  const router = Router();

  router.get("/openapi.json", (_req: Request, res: Response) => {
    res.status(200).json(openApiDocument);
  });

  router.use(
    "/docs",
    apiReference({
      theme: "default",
      layout: "modern",
      darkMode: false,
      hideModels: false,
      metaData: {
        title: "support-api docs",
      },
      // Prefer URL so Scalar can refresh without re-embedding the whole doc.
      url: "/openapi.json",
      authentication: {
        preferredSecurityScheme: "ApiKeyAuth",
      },
    }),
  );

  return router;
}
