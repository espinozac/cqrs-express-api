import { ICommand, ICommandHandler } from "../../bus/Command";
import { NotFoundError } from "../../../domain/errors/AppError";
import { Cradle } from "../../../container/types";

export class InitiateReturnCommand implements ICommand {
  readonly type = "InitiateReturnCommand";
  constructor(
    public readonly orderId: string,
    public readonly reason?: string,
  ) {}
}

/** Mirrors the `initiate_return` action from the support-agent design. */
export class InitiateReturnHandler implements ICommandHandler<InitiateReturnCommand, void> {
  private orderRepository: Cradle["orderRepository"];
  private emailService: Cradle["emailService"];
  private logger: Cradle["logger"];

  constructor({
    orderRepository,
    emailService,
    logger,
  }: Pick<Cradle, "orderRepository" | "emailService" | "logger">) {
    this.orderRepository = orderRepository;
    this.emailService = emailService;
    this.logger = logger;
  }

  async execute(command: InitiateReturnCommand): Promise<void> {
    const order = await this.orderRepository.findById(command.orderId);
    if (!order) {
      throw new NotFoundError("Order", command.orderId);
    }

    order.requestReturn();
    await this.orderRepository.save(order);
    this.logger.info("Return initiated", { orderId: order.id, reason: command.reason });

    try {
      await this.emailService.send({
        to: order.customerEmail,
        subject: `Return requested for order #${order.id}`,
        body: `We've received your return request${command.reason ? `: ${command.reason}` : "."} We'll follow up with next steps shortly.`,
      });
    } catch (error) {
      this.logger.warn("Return confirmation email failed to send", {
        orderId: order.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
