import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().nonnegative(),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    price: z.coerce.number().nonnegative(),
    stock: z.coerce.number().int().nonnegative(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Accepted as either JSON body fields or querystring params (e.g. GET /api/products?search=widget&page=2)
export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().min(1).max(200).optional(),
});
