import { ICommand, ICommandHandler } from "../../bus/Command";
import { NotFoundError } from "../../../domain/errors/AppError";
import { Cradle } from "../../../container/types";

export class CancelOrderCommand implements ICommand {
  readonly type = "CancelOrderCommand";
  constructor(public readonly orderId: string) {}
}

export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, void> {
  private orderRepository: Cradle["orderRepository"];
  private logger: Cradle["logger"];

  constructor({ orderRepository, logger }: Pick<Cradle, "orderRepository" | "logger">) {
    this.orderRepository = orderRepository;
    this.logger = logger;
  }

  async execute(command: CancelOrderCommand): Promise<void> {
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      throw new NotFoundError("Order", command.orderId);
    }

    order.cancel();
    await this.orderRepository.save(order);
    this.logger.info("Order cancelled", { orderId: order.id });
  }
}
