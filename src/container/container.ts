import { AwilixContainer, InjectionMode, asClass, asFunction, asValue, createContainer } from "awilix";
import { Cradle } from "./types";
import { loadConfig } from "../infrastructure/config/env";
import { createPrismaClient } from "../infrastructure/persistence/prisma/client";
import { PinoLogger } from "../infrastructure/logging/PinoLogger";
import { Metrics } from "../infrastructure/observability/Metrics";
import { ConsoleEmailService } from "../infrastructure/services/email/ConsoleEmailService";
import { PrismaProductRepository } from "../infrastructure/persistence/prisma/PrismaProductRepository";
import { PrismaOrderRepository } from "../infrastructure/persistence/prisma/PrismaOrderRepository";
import { InMemoryProductRepository } from "../infrastructure/persistence/memory/InMemoryProductRepository";
import { InMemoryOrderRepository } from "../infrastructure/persistence/memory/InMemoryOrderRepository";
import { IProductRepository } from "../domain/repositories/IProductRepository";
import { IOrderRepository } from "../domain/repositories/IOrderRepository";
import { CommandBus } from "../application/bus/Command";
import { QueryBus } from "../application/bus/Query";

import { CreateProductHandler } from "../application/commands/products/CreateProductCommand";
import { UpdateProductHandler } from "../application/commands/products/UpdateProductCommand";
import { DeleteProductHandler } from "../application/commands/products/DeleteProductCommand";
import { GetProductByIdHandler } from "../application/queries/products/GetProductByIdQuery";
import { ListProductsHandler } from "../application/queries/products/ListProductsQuery";

import { CreateOrderHandler } from "../application/commands/orders/CreateOrderCommand";
import { InitiateReturnHandler } from "../application/commands/orders/InitiateReturnCommand";
import { CancelOrderHandler } from "../application/commands/orders/CancelOrderCommand";
import { GetOrderByIdHandler } from "../application/queries/orders/GetOrderByIdQuery";
import { GetOrderStatusHandler } from "../application/queries/orders/GetOrderStatusQuery";
import { ListOrdersHandler } from "../application/queries/orders/ListOrdersQuery";

import { ProductController } from "../presentation/http/controllers/ProductController";
import { OrderController } from "../presentation/http/controllers/OrderController";

/**
 * The composition root's core: a single Awilix container that owns every
 * object's lifetime. Nothing outside this file ever calls `new` on an
 * infrastructure or application class directly — that's what makes every
 * dependency swappable (e.g. PrismaProductRepository -> an in-memory fake in
 * tests) without editing the classes that use it.
 *
 * `InjectionMode.PROXY` means each class receives ONE constructor argument:
 * a proxy object exposing every registration by name. Classes declare only
 * the slice they need via `Pick<Cradle, "logger" | "productRepository">`,
 * which doubles as self-documentation of their dependencies.
 */
export type AppContainer = AwilixContainer;

export function buildContainer(): AppContainer {
  const container = createContainer({ injectionMode: InjectionMode.PROXY });
  const config = loadConfig();

  container.register({
    config: asValue(config),
    // Only stand up a real Prisma client (and, transitively, require its generated
    // query engine) when the "prisma" driver is actually selected. This keeps
    // PERSISTENCE_DRIVER=memory genuinely dependency-free — handy for tests/CI
    // sandboxes without database or native-binary access.
    prisma: asFunction(({ config }: Cradle) =>
      config.PERSISTENCE_DRIVER === "prisma" ? createPrismaClient(config) : undefined,
    ).singleton(),
    logger: asFunction(({ config }: Cradle) => new PinoLogger(config)).singleton(),
    metrics: asClass(Metrics).singleton(),

    emailService: asClass(ConsoleEmailService).singleton(),

    productRepository: asFunction(({ config, prisma }: Cradle): IProductRepository =>
      config.PERSISTENCE_DRIVER === "prisma"
        ? new PrismaProductRepository({ prisma: prisma! })
        : new InMemoryProductRepository(),
    ).singleton(),
    orderRepository: asFunction(({ config, prisma }: Cradle): IOrderRepository =>
      config.PERSISTENCE_DRIVER === "prisma"
        ? new PrismaOrderRepository({ prisma: prisma! })
        : new InMemoryOrderRepository(),
    ).singleton(),

    commandBus: asClass(CommandBus).singleton(),
    queryBus: asClass(QueryBus).singleton(),

    productController: asClass(ProductController).scoped(),
    orderController: asClass(OrderController).scoped(),
  });

  registerHandlersOnBuses(container);

  return container;
}

/**
 * CQRS wiring: every command/query handler is registered in the container
 * like any other class (so it gets constructor injection), then registered
 * a second time onto the CommandBus/QueryBus under its command/query `type`
 * string. Controllers never import a handler directly — only the bus.
 */
function registerHandlersOnBuses(container: AppContainer): void {
  container.register({
    createProductHandler: asClass(CreateProductHandler).scoped(),
    updateProductHandler: asClass(UpdateProductHandler).scoped(),
    deleteProductHandler: asClass(DeleteProductHandler).scoped(),
    getProductByIdHandler: asClass(GetProductByIdHandler).scoped(),
    listProductsHandler: asClass(ListProductsHandler).scoped(),

    createOrderHandler: asClass(CreateOrderHandler).scoped(),
    initiateReturnHandler: asClass(InitiateReturnHandler).scoped(),
    cancelOrderHandler: asClass(CancelOrderHandler).scoped(),
    getOrderByIdHandler: asClass(GetOrderByIdHandler).scoped(),
    getOrderStatusHandler: asClass(GetOrderStatusHandler).scoped(),
    listOrdersHandler: asClass(ListOrdersHandler).scoped(),
  });

  const commandBus: CommandBus = container.resolve("commandBus");
  const queryBus: QueryBus = container.resolve("queryBus");

  commandBus.register("CreateProductCommand", container.resolve("createProductHandler"));
  commandBus.register("UpdateProductCommand", container.resolve("updateProductHandler"));
  commandBus.register("DeleteProductCommand", container.resolve("deleteProductHandler"));
  commandBus.register("CreateOrderCommand", container.resolve("createOrderHandler"));
  commandBus.register("InitiateReturnCommand", container.resolve("initiateReturnHandler"));
  commandBus.register("CancelOrderCommand", container.resolve("cancelOrderHandler"));

  queryBus.register("GetProductByIdQuery", container.resolve("getProductByIdHandler"));
  queryBus.register("ListProductsQuery", container.resolve("listProductsHandler"));
  queryBus.register("GetOrderByIdQuery", container.resolve("getOrderByIdHandler"));
  queryBus.register("GetOrderStatusQuery", container.resolve("getOrderStatusHandler"));
  queryBus.register("ListOrdersQuery", container.resolve("listOrdersHandler"));
}
