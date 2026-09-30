import { PrismaClient, Product as PrismaProduct } from "@prisma/client";
import { IProductRepository, Paginated, ProductListFilter } from "../../../domain/repositories/IProductRepository";
import { Product } from "../../../domain/entities/Product";

/**
 * Adapter: implements the IProductRepository port on top of Prisma/SQLite.
 * All Prisma-specific types stay inside this file — everything above the
 * repository interface only ever sees the domain `Product` entity.
 */
export class PrismaProductRepository implements IProductRepository {
  private prisma: PrismaClient;

  constructor({ prisma }: { prisma: PrismaClient }) {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { sku } });
    return row ? toDomain(row) : null;
  }

  async list(filter: ProductListFilter): Promise<Paginated<Product>> {
    const where = filter.search
      ? {
          OR: [
            { name: { contains: filter.search } },
            { sku: { contains: filter.search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async save(product: Product): Promise<void> {
    const props = product.toJSON();
    await this.prisma.product.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        sku: props.sku,
        name: props.name,
        description: props.description,
        price: props.price,
        stock: props.stock,
      },
      update: {
        name: props.name,
        description: props.description,
        price: props.price,
        stock: props.stock,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } }).catch(() => {
      // Idempotent delete: repository callers already checked existence via
      // findById before calling this, so a race here is treated as a no-op
      // rather than surfacing a raw Prisma error to the application layer.
    });
  }
}

function toDomain(row: PrismaProduct): Product {
  return Product.fromPersistence({
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: row.price,
    stock: row.stock,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
