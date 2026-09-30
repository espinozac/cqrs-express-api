import { IOrderRepository, OrderListFilter } from "../../../domain/repositories/IOrderRepository";
import { Paginated } from "../../../domain/repositories/IProductRepository";
import { Order } from "../../../domain/entities/Order";

/** In-memory adapter for IOrderRepository — see InMemoryProductRepository for rationale. */
export class InMemoryOrderRepository implements IOrderRepository {
  private store = new Map<string, Order>();

  async findById(id: string): Promise<Order | null> {
    return this.store.get(id) ?? null;
  }

  async list(filter: OrderListFilter): Promise<Paginated<Order>> {
    let items = [...this.store.values()];

    if (filter.status) {
      items = items.filter((order) => order.status === filter.status);
    }
    if (filter.customerEmail) {
      items = items.filter((order) => order.customerEmail === filter.customerEmail);
    }

    items.sort((a, b) => b.toJSON().createdAt.getTime() - a.toJSON().createdAt.getTime());

    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    const pageItems = items.slice(start, start + filter.pageSize);

    return { items: pageItems, total, page: filter.page, pageSize: filter.pageSize };
  }

  async save(order: Order): Promise<void> {
    this.store.set(order.id, order);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
