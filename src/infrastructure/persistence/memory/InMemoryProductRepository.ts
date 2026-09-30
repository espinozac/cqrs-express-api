import { IProductRepository, Paginated, ProductListFilter } from "../../../domain/repositories/IProductRepository";
import { Product } from "../../../domain/entities/Product";

/**
 * Zero-dependency adapter implementing the same IProductRepository port as
 * PrismaProductRepository. Handy for fast tests or local development
 * without a database — select it with PERSISTENCE_DRIVER=memory. Nothing
 * above the repository interface (commands, queries, controllers) can tell
 * which adapter is behind it, which is the point of depending on a port.
 */
export class InMemoryProductRepository implements IProductRepository {
  private store = new Map<string, Product>();

  async findById(id: string): Promise<Product | null> {
    return this.store.get(id) ?? null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    for (const product of this.store.values()) {
      if (product.sku === sku) return product;
    }
    return null;
  }

  async list(filter: ProductListFilter): Promise<Paginated<Product>> {
    let items = [...this.store.values()];

    if (filter.search) {
      const term = filter.search.toLowerCase();
      items = items.filter((product) => {
        const json = product.toJSON();
        return json.name.toLowerCase().includes(term) || json.sku.toLowerCase().includes(term);
      });
    }

    items.sort((a, b) => b.toJSON().createdAt.getTime() - a.toJSON().createdAt.getTime());

    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    const pageItems = items.slice(start, start + filter.pageSize);

    return { items: pageItems, total, page: filter.page, pageSize: filter.pageSize };
  }

  async save(product: Product): Promise<void> {
    this.store.set(product.id, product);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
