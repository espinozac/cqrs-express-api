import { IQuery, IQueryHandler } from "../../bus/Query";
import { NotFoundError } from "../../../domain/errors/AppError";
import { OrderSnapshot } from "../../../domain/entities/Order";
import { Cradle } from "../../../container/types";

export class GetOrderByIdQuery implements IQuery {
  readonly type = "GetOrderByIdQuery";
  constructor(public readonly orderId: string) {}
}

export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery, OrderSnapshot> {
  private orderRepository: Cradle["orderRepository"];

  constructor({ orderRepository }: Pick<Cradle, "orderRepository">) {
    this.orderRepository = orderRepository;
  }

  async execute(query: GetOrderByIdQuery): Promise<OrderSnapshot> {
    const order = await this.orderRepository.findById(query.orderId);
    if (!order) {
      throw new NotFoundError("Order", query.orderId);
    }
    return order.toJSON();
  }
}
