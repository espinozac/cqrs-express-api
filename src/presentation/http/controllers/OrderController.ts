import { Request, Response } from "express";
import { Cradle } from "../../../container/types";
import { CreateOrderCommand } from "../../../application/commands/orders/CreateOrderCommand";
import { InitiateReturnCommand } from "../../../application/commands/orders/InitiateReturnCommand";
import { CancelOrderCommand } from "../../../application/commands/orders/CancelOrderCommand";
import { GetOrderByIdQuery } from "../../../application/queries/orders/GetOrderByIdQuery";
import { GetOrderStatusQuery } from "../../../application/queries/orders/GetOrderStatusQuery";
import { ListOrdersQuery } from "../../../application/queries/orders/ListOrdersQuery";
import { OrderSnapshot, OrderStatus } from "../../../domain/entities/Order";
import { Paginated } from "../../../domain/repositories/IProductRepository";

export class OrderController {
  private commandBus: Cradle["commandBus"];
  private queryBus: Cradle["queryBus"];

  constructor({ commandBus, queryBus }: Pick<Cradle, "commandBus" | "queryBus">) {
    this.commandBus = commandBus;
    this.queryBus = queryBus;
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.commandBus.execute(new CreateOrderCommand(req.body));
    res.status(201).json({ data: result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const result = await this.queryBus.execute(new GetOrderByIdQuery(req.params.id));
    res.status(200).json({ data: result });
  };

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const result = await this.queryBus.execute(new GetOrderStatusQuery(req.params.id));
    res.status(200).json({ data: result });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as {
      status?: OrderStatus;
      customerEmail?: string;
      page: number;
      pageSize: number;
    };
    const result = await this.queryBus.execute<ListOrdersQuery, Paginated<OrderSnapshot>>(
      new ListOrdersQuery(query),
    );
    res.status(200).json({
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize },
    });
  };

  initiateReturn = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute(new InitiateReturnCommand(req.params.id, req.body?.reason));
    res.status(202).json({ data: { orderId: req.params.id, status: "RETURN_REQUESTED" } });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute(new CancelOrderCommand(req.params.id));
    res.status(200).json({ data: { orderId: req.params.id, status: "CANCELLED" } });
  };
}
