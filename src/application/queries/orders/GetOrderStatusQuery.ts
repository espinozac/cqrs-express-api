import { IQuery, IQueryHandler } from "../../bus/Query";
import { NotFoundError } from "../../../domain/errors/AppError";
import { OrderStatus } from "../../../domain/entities/Order";
import { Cradle } from "../../../container/types";

/** A narrow, cheap read — mirrors the `check_order_status` action from the support-agent design. */
export class GetOrderStatusQuery implements IQuery {
  readonly type = "GetOrderStatusQuery";
  constructor(public readonly orderId: string) {}
}

export interface OrderStatusResult {
  orderId: string;
  status: OrderStatus;
  updatedAt: Date;
}

export class GetOrderStatusHandler implements IQueryHandler<GetOrderStatusQuery, OrderStatusResult> {
  private orderRepository: Cradle["orderRepository"];

  constructor({ orderRepository }: Pick<Cradle, "orderRepository">) {
    this.orderRepository = orderRepository;
  }

  async execute(query: GetOrderStatusQuery): Promise<OrderStatusResult> {
    const order = await this.orderRepository.findById(query.orderId);
    if (!order) {
      throw new NotFoundError("Order", query.orderId);
    }
    const json = order.toJSON();
    return { orderId: json.id, status: json.status, updatedAt: json.updatedAt };
  }
}
