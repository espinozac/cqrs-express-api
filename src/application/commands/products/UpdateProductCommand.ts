import { ICommand, ICommandHandler } from "../../bus/Command";
import { NotFoundError } from "../../../domain/errors/AppError";
import { Cradle } from "../../../container/types";

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  price?: number;
  stock?: number;
}

export class UpdateProductCommand implements ICommand {
  readonly type = "UpdateProductCommand";
  constructor(
    public readonly productId: string,
    public readonly input: UpdateProductInput,
  ) {}
}

export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand, void> {
  private productRepository: Cradle["productRepository"];
  private logger: Cradle["logger"];

  constructor({ productRepository, logger }: Pick<Cradle, "productRepository" | "logger">) {
    this.productRepository = productRepository;
    this.logger = logger;
  }

  async execute(command: UpdateProductCommand): Promise<void> {
    const product = await this.productRepository.findById(command.productId);
    if (!product) {
      throw new NotFoundError("Product", command.productId);
    }

    product.applyUpdate(command.input);
    await this.productRepository.save(product);
    this.logger.info("Product updated", { productId: product.id, patch: command.input });
  }
}
