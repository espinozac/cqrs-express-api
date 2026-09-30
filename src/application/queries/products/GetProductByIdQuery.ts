import { IQuery, IQueryHandler } from "../../bus/Query";
import { NotFoundError } from "../../../domain/errors/AppError";
import { ProductProps } from "../../../domain/entities/Product";
import { Cradle } from "../../../container/types";

export class GetProductByIdQuery implements IQuery {
  readonly type = "GetProductByIdQuery";
  constructor(public readonly productId: string) {}
}

export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery, ProductProps> {
  private productRepository: Cradle["productRepository"];

  constructor({ productRepository }: Pick<Cradle, "productRepository">) {
    this.productRepository = productRepository;
  }

  async execute(query: GetProductByIdQuery): Promise<ProductProps> {
    const product = await this.productRepository.findById(query.productId);
    if (!product) {
      throw new NotFoundError("Product", query.productId);
    }
    return product.toJSON();
  }
}
