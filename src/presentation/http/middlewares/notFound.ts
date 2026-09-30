import { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `No route for ${req.method} ${req.originalUrl}`,
    },
  });
}
