import { randomUUID } from "crypto";
import { ValidationError } from "../errors/AppError";

export interface ProductProps {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain entity. Framework-agnostic on purpose: no Prisma types, no Express
 * types, no decorators tied to a specific ORM. Invariants that must ALWAYS
 * hold for a Product live here, not scattered across controllers.
 */
export class Product {
  private constructor(private props: ProductProps) {}

  static create(props: Omit<ProductProps, "id" | "createdAt" | "updatedAt"> & { id?: string }): Product {
    if (!props.name?.trim()) {
      throw new ValidationError("Product name is required");
    }
    if (!props.sku?.trim()) {
      throw new ValidationError("Product sku is required");
    }
    if (props.price < 0) {
      throw new ValidationError("Product price cannot be negative");
    }
    if (props.stock < 0) {
      throw new ValidationError("Product stock cannot be negative");
    }

    const now = new Date();
    return new Product({
      id: props.id ?? randomUUID(),
      sku: props.sku.trim(),
      name: props.name.trim(),
      description: props.description ?? null,
      price: props.price,
      stock: props.stock,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Rehydrate from persistence — skips id/timestamp generation. */
  static fromPersistence(props: ProductProps): Product {
    return new Product(props);
  }

  decreaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new ValidationError("Quantity must be positive");
    }
    if (this.props.stock < quantity) {
      throw new ValidationError(
        `Insufficient stock for product ${this.props.sku}: requested ${quantity}, available ${this.props.stock}`,
      );
    }
    this.props.stock -= quantity;
    this.props.updatedAt = new Date();
  }

  applyUpdate(patch: Partial<Pick<ProductProps, "name" | "description" | "price" | "stock">>): void {
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new ValidationError("Product name cannot be empty");
      this.props.name = patch.name.trim();
    }
    if (patch.description !== undefined) this.props.description = patch.description;
    if (patch.price !== undefined) {
      if (patch.price < 0) throw new ValidationError("Product price cannot be negative");
      this.props.price = patch.price;
    }
    if (patch.stock !== undefined) {
      if (patch.stock < 0) throw new ValidationError("Product stock cannot be negative");
      this.props.stock = patch.stock;
    }
    this.props.updatedAt = new Date();
  }

  toJSON(): ProductProps {
    return { ...this.props };
  }

  get id() { return this.props.id; }
  get sku() { return this.props.sku; }
  get price() { return this.props.price; }
  get stock() { return this.props.stock; }
}
