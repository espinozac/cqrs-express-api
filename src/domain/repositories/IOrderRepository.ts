import { Order, OrderStatus } from "../entities/Order";
import { Paginated } from "./IProductRepository";

export interface OrderListFilter {
  status?: OrderStatus;
  customerEmail?: string;
  page: number;
  pageSize: number;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  list(filter: OrderListFilter): Promise<Paginated<Order>>;
  save(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}
