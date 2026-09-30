import { ICommand, ICommandHandler } from "../../bus/Command";
import { Product } from "../../../domain/entities/Product";
import { ConflictError } from "../../../domain/errors/AppError";
import { Cradle } from "../../../container/types";

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
}

export class CreateProductCommand implements ICommand {
  readonly type = "CreateProductCommand";
  constructor(public readonly input: CreateProductInput) {}
}

export interface CreateProductResult {
  id: string;
}

export class CreateProductHandler
  implements ICommandHandler<CreateProductCommand, CreateProductResult>
{
  private productRepository: Cradle["productRepository"];
  private logger: Cradle["logger"];

  constructor({ productRepository, logger }: Pick<Cradle, "productRepository" | "logger">) {
    this.productRepository = productRepository;
    this.logger = logger;
  }

  async execute(command: CreateProductCommand): Promise<CreateProductResult> {
    const existing = await this.productRepository.findBySku(command.input.sku);
    if (existing) {
      throw new ConflictError(`A product with sku "${command.input.sku}" already exists`);
    }

    const product = Product.create({
      sku: command.input.sku,
      name: command.input.name,
      description: command.input.description ?? null,
      price: command.input.price,
      stock: command.input.stock,
    });

    await this.productRepository.save(product);
    this.logger.info("Product created", { productId: product.id, sku: product.sku });

    return { id: product.id };
  }
}
