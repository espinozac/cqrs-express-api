import { Request, Response } from "express";
import { Cradle } from "../../../container/types";
import { CreateProductCommand } from "../../../application/commands/products/CreateProductCommand";
import { UpdateProductCommand } from "../../../application/commands/products/UpdateProductCommand";
import { DeleteProductCommand } from "../../../application/commands/products/DeleteProductCommand";
import { GetProductByIdQuery } from "../../../application/queries/products/GetProductByIdQuery";
import { ListProductsQuery } from "../../../application/queries/products/ListProductsQuery";
import { ProductProps } from "../../../domain/entities/Product";
import { Paginated } from "../../../domain/repositories/IProductRepository";

/**
 * Controllers are deliberately thin: parse nothing (validation middleware
 * already did that), contain no business rules, and only translate an HTTP
 * request into a Command/Query and its result back into an HTTP response.
 */
export class ProductController {
  private commandBus: Cradle["commandBus"];
  private queryBus: Cradle["queryBus"];

  constructor({ commandBus, queryBus }: Pick<Cradle, "commandBus" | "queryBus">) {
    this.commandBus = commandBus;
    this.queryBus = queryBus;
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const result = await this.commandBus.execute(new CreateProductCommand(req.body));
    res.status(201).json({ data: result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const result = await this.queryBus.execute(new GetProductByIdQuery(req.params.id));
    res.status(200).json({ data: result });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as { search?: string; page: number; pageSize: number };
    const result = await this.queryBus.execute<ListProductsQuery, Paginated<ProductProps>>(
      new ListProductsQuery({ search: query.search, page: query.page, pageSize: query.pageSize }),
    );
    res.status(200).json({
      data: result.items,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize },
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute(new UpdateProductCommand(req.params.id, req.body));
    res.status(204).send();
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.commandBus.execute(new DeleteProductCommand(req.params.id));
    res.status(204).send();
  };
}
