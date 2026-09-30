import { Router } from "express";
import { ProductController } from "../controllers/ProductController";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../middlewares/asyncHandler";
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from "../schemas/product.schema";
import { idParamSchema } from "../schemas/common.schema";

export function productRoutes(controller: ProductController): Router {
  const router = Router();

  router.post("/", validate({ body: createProductSchema }), asyncHandler(controller.create));
  router.get("/", validate({ query: listProductsQuerySchema }), asyncHandler(controller.list));
  router.get("/:id", validate({ params: idParamSchema }), asyncHandler(controller.getById));
  router.patch(
    "/:id",
    validate({ params: idParamSchema, body: updateProductSchema }),
    asyncHandler(controller.update),
  );
  router.delete("/:id", validate({ params: idParamSchema }), asyncHandler(controller.remove));

  return router;
}
