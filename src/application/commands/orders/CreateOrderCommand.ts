import { ICommand, ICommandHandler } from "../../bus/Command";
import { Order } from "../../../domain/entities/Order";
import { NotFoundError, ValidationError } from "../../../domain/errors/AppError";
import { Cradle } from "../../../container/types";

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  items: CreateOrderItemInput[];
}

export class CreateOrderCommand implements ICommand {
  readonly type = "CreateOrderCommand";
  constructor(public readonly input: CreateOrderInput) {}
}

export interface CreateOrderResult {
  id: string;
  total: number;
}

/**
 * Orchestrates across two aggregates (Product, Order) plus a third-party
 * side effect (email) — a good example of why this belongs in an
 * application-layer handler rather than inside either entity.
 */
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, CreateOrderResult> {
  private orderRepository: Cradle["orderRepository"];
  private productRepository: Cradle["productRepository"];
  private emailService: Cradle["emailService"];
  private logger: Cradle["logger"];

  constructor({
    orderRepository,
    productRepository,
    emailService,
    logger,
  }: Pick<Cradle, "orderRepository" | "productRepository" | "emailService" | "logger">) {
    this.orderRepository = orderRepository;
    this.productRepository = productRepository;
    this.emailService = emailService;
    this.logger = logger;
  }

  async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    if (!command.input.items?.length) {
      throw new ValidationError("Order must contain at least one item");
    }

    const resolvedItems = [];
    for (const line of command.input.items) {
      const product = await this.productRepository.findById(line.productId);
      if (!product) {
        throw new NotFoundError("Product", line.productId);
      }
      product.decreaseStock(line.quantity);
      resolvedItems.push({
        productId: product.id,
        quantity: line.quantity,
        unitPrice: product.price,
      });
      await this.productRepository.save(product);
    }

    const order = Order.create({
      customerName: command.input.customerName,
      customerEmail: command.input.customerEmail,
      items: resolvedItems,
    });

    await this.orderRepository.save(order);
    this.logger.info("Order created", { orderId: order.id, total: order.total });

    // Third-party side effect. Failures here are logged but never roll back
    // the order — email delivery is best-effort, not part of the invariant.
    try {
      await this.emailService.send({
        to: order.customerEmail,
        subject: `Order confirmation #${order.id}`,
        body: `Thanks for your order! Total: $${order.total.toFixed(2)}`,
      });
    } catch (error) {
      this.logger.warn("Order confirmation email failed to send", {
        orderId: order.id,
        error: error instanceof Error ? error.message : error,
      });
    }

    return { id: order.id, total: order.total };
  }
}
