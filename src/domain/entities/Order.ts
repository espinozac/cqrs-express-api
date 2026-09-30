import { randomUUID } from "crypto";
import { BusinessRuleError, ValidationError } from "../errors/AppError";

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  RETURN_REQUESTED = "RETURN_REQUESTED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}

export interface OrderItemProps {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderProps {
  id: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItemProps[];
  createdAt: Date;
  updatedAt: Date;
}

/** Transitions allowed for an order's lifecycle. Encoded once, here. */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.RETURN_REQUESTED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export class Order {
  private constructor(private props: OrderProps) {}

  static create(input: {
    id?: string;
    customerName: string;
    customerEmail: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  }): Order {
    if (!input.customerName?.trim()) throw new ValidationError("customerName is required");
    if (!isValidEmail(input.customerEmail)) throw new ValidationError("customerEmail must be a valid email address");
    if (!input.items?.length) throw new ValidationError("Order must contain at least one item");

    for (const item of input.items) {
      if (item.quantity <= 0) throw new ValidationError("Item quantity must be positive");
      if (item.unitPrice < 0) throw new ValidationError("Item unitPrice cannot be negative");
    }

    const now = new Date();
    return new Order({
      id: input.id ?? randomUUID(),
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      status: OrderStatus.PENDING,
      items: input.items.map((item) => ({ id: randomUUID(), ...item })),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: OrderProps): Order {
    return new Order(props);
  }

  get total(): number {
    return this.props.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  transitionTo(next: OrderStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new BusinessRuleError(
        `Cannot move order from ${this.props.status} to ${next}`,
        { from: this.props.status, to: next, allowed },
      );
    }
    this.props.status = next;
    this.props.updatedAt = new Date();
  }

  requestReturn(): void {
    this.transitionTo(OrderStatus.RETURN_REQUESTED);
  }

  cancel(): void {
    this.transitionTo(OrderStatus.CANCELLED);
  }

  confirm(): void {
    this.transitionTo(OrderStatus.CONFIRMED);
  }

  toJSON() {
    return { ...this.props, total: this.total };
  }

  get id() { return this.props.id; }
  get status() { return this.props.status; }
  get customerEmail() { return this.props.customerEmail; }
  get items() { return this.props.items; }
}

/** Plain-object shape returned by Order.toJSON() — used to type API responses without leaking the Order class itself. */
export type OrderSnapshot = ReturnType<Order["toJSON"]>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value ?? "");
}
