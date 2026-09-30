import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../middlewares/asyncHandler";
import { createOrderSchema, initiateReturnSchema, listOrdersQuerySchema } from "../schemas/order.schema";
import { idParamSchema } from "../schemas/common.schema";

export function orderRoutes(controller: OrderController): Router {
  const router = Router();

  router.post("/", validate({ body: createOrderSchema }), asyncHandler(controller.create));
  router.get("/", validate({ query: listOrdersQuerySchema }), asyncHandler(controller.list));
  router.get("/:id", validate({ params: idParamSchema }), asyncHandler(controller.getById));
  router.get("/:id/status", validate({ params: idParamSchema }), asyncHandler(controller.getStatus));
  router.post(
    "/:id/returns",
    validate({ params: idParamSchema, body: initiateReturnSchema }),
    asyncHandler(controller.initiateReturn),
  );
  router.post("/:id/cancel", validate({ params: idParamSchema }), asyncHandler(controller.cancel));

  return router;
}
