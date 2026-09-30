import { PrismaClient } from "@prisma/client";
import { AppConfig } from "../../config/env";

export function createPrismaClient(config: AppConfig): PrismaClient {
  return new PrismaClient({
    datasourceUrl: config.DATABASE_URL,
    log: config.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}
