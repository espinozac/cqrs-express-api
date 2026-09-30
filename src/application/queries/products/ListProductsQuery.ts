import { IQuery, IQueryHandler } from "../../bus/Query";
import { ProductProps } from "../../../domain/entities/Product";
import { Paginated } from "../../../domain/repositories/IProductRepository";
import { Cradle } from "../../../container/types";

export class ListProductsQuery implements IQuery {
  readonly type = "ListProductsQuery";
  constructor(
    public readonly filter: { search?: string; page: number; pageSize: number },
  ) {}
}

export class ListProductsHandler
  implements IQueryHandler<ListProductsQuery, Paginated<ProductProps>>
{
  private productRepository: Cradle["productRepository"];

  constructor({ productRepository }: Pick<Cradle, "productRepository">) {
    this.productRepository = productRepository;
  }

  async execute(query: ListProductsQuery): Promise<Paginated<ProductProps>> {
    const result = await this.productRepository.list(query.filter);
    return {
      ...result,
      items: result.items.map((product) => product.toJSON()),
    };
  }
}
