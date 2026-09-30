import { PrismaClient } from "@prisma/client";
import { IProductRepository } from "../domain/repositories/IProductRepository";
import { IOrderRepository } from "../domain/repositories/IOrderRepository";
import { ILogger } from "../application/ports/ILogger";
import { IEmailService } from "../application/ports/IEmailService";
import { CommandBus } from "../application/bus/Command";
import { QueryBus } from "../application/bus/Query";
import { AppConfig } from "../infrastructure/config/env";
import { Metrics } from "../infrastructure/observability/Metrics";

/**
 * The full shape of the DI container ("cradle" in Awilix terms). Every
 * class resolved by the container receives a single constructor argument
 * typed as `Pick<Cradle, ...>` of just the dependencies it needs — that
 * Pick is a cheap, honest interface: reading a class's constructor tells
 * you exactly what it depends on.
 */
export interface Cradle {
  config: AppConfig;
  /** undefined when PERSISTENCE_DRIVER=memory — no database is created in that mode. */
  prisma: PrismaClient | undefined;
  logger: ILogger;
  metrics: Metrics;
  emailService: IEmailService;
  productRepository: IProductRepository;
  orderRepository: IOrderRepository;
  commandBus: CommandBus;
  queryBus: QueryBus;
}
