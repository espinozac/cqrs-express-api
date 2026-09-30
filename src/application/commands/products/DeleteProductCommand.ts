import { ICommand, ICommandHandler } from "../../bus/Command";
import { NotFoundError } from "../../../domain/errors/AppError";
import { Cradle } from "../../../container/types";

export class DeleteProductCommand implements ICommand {
  readonly type = "DeleteProductCommand";
  constructor(public readonly productId: string) {}
}

export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand, void> {
  private productRepository: Cradle["productRepository"];
  private logger: Cradle["logger"];

  constructor({ productRepository, logger }: Pick<Cradle, "productRepository" | "logger">) {
    this.productRepository = productRepository;
    this.logger = logger;
  }

  async execute(command: DeleteProductCommand): Promise<void> {
    const product = await this.productRepository.findById(command.productId);
    if (!product) {
      throw new NotFoundError("Product", command.productId);
    }

    await this.productRepository.delete(command.productId);
    this.logger.info("Product deleted", { productId: command.productId });
  }
}
