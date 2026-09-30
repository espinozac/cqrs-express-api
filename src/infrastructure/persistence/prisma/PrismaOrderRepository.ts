import { PrismaClient, Order as PrismaOrder, OrderItem as PrismaOrderItem } from "@prisma/client";
import { IOrderRepository, OrderListFilter } from "../../../domain/repositories/IOrderRepository";
import { Paginated } from "../../../domain/repositories/IProductRepository";
import { Order, OrderStatus } from "../../../domain/entities/Order";

type PrismaOrderWithItems = PrismaOrder & { items: PrismaOrderItem[] };

export class PrismaOrderRepository implements IOrderRepository {
  private prisma: PrismaClient;

  constructor({ prisma }: { prisma: PrismaClient }) {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    return row ? toDomain(row) : null;
  }

  async list(filter: OrderListFilter): Promise<Paginated<Order>> {
    const where = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.customerEmail ? { customerEmail: filter.customerEmail } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: rows.map(toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async save(order: Order): Promise<void> {
    const props = order.toJSON();

    // Typed `any` here rather than `Prisma.TransactionClient`: that namespace only
    // exists once `npx prisma generate` has run against schema.prisma (see README).
    await this.prisma.$transaction(async (tx: any) => {
      await tx.order.upsert({
        where: { id: props.id },
        create: {
          id: props.id,
          customerName: props.customerName,
          customerEmail: props.customerEmail,
          status: props.status,
          total: props.total,
        },
        update: {
          customerName: props.customerName,
          customerEmail: props.customerEmail,
          status: props.status,
          total: props.total,
        },
      });

      for (const item of props.items) {
        await tx.orderItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            orderId: props.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          },
          update: {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          },
        });
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.delete({ where: { id } }).catch(() => {
      // Idempotent delete — see PrismaProductRepository.delete for rationale.
    });
  }
}

function toDomain(row: PrismaOrderWithItems): Order {
  return Order.fromPersistence({
    id: row.id,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    status: row.status as OrderStatus,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
