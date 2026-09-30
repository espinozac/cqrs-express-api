import { IQuery, IQueryHandler } from "../../bus/Query";
import { OrderSnapshot, OrderStatus } from "../../../domain/entities/Order";
import { Paginated } from "../../../domain/repositories/IProductRepository";
import { Cradle } from "../../../container/types";

export class ListOrdersQuery implements IQuery {
  readonly type = "ListOrdersQuery";
  constructor(
    public readonly filter: {
      status?: OrderStatus;
      customerEmail?: string;
      page: number;
      pageSize: number;
    },
  ) {}
}

export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery, Paginated<OrderSnapshot>> {
  private orderRepository: Cradle["orderRepository"];

  constructor({ orderRepository }: Pick<Cradle, "orderRepository">) {
    this.orderRepository = orderRepository;
  }

  async execute(query: ListOrdersQuery): Promise<Paginated<OrderSnapshot>> {
    const result = await this.orderRepository.list(query.filter);
    return {
      ...result,
      items: result.items.map((order) => order.toJSON()),
    };
  }
}
