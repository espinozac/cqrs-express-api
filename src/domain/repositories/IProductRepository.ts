import { Product } from "../entities/Product";

export interface ProductListFilter {
  search?: string;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Port (in the hexagonal-architecture sense): the application layer depends
 * only on this interface, never on Prisma directly. Any adapter — Prisma,
 * an in-memory fake for tests, a different ORM — can implement it.
 */
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  list(filter: ProductListFilter): Promise<Paginated<Product>>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
