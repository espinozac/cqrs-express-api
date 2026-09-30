import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";
import { OrderStatus } from "../../../domain/entities/Order";

export const createOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1, "Order must contain at least one item"),
});

export const initiateReturnSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(OrderStatus).optional(),
  customerEmail: z.string().email().optional(),
});
