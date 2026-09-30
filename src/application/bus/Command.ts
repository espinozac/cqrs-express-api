/**
 * Minimal CQRS mediator: commands mutate state, queries read it, and each
 * has its own bus so the presentation layer never calls a handler directly
 * — it dispatches a plain data object and lets the bus route it. This keeps
 * controllers thin and makes cross-cutting concerns (logging, validation,
 * metrics) easy to add in one place later without touching every handler.
 */
export interface ICommand {
  readonly type: string;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

export class CommandBus {
  private handlers = new Map<string, ICommandHandler<ICommand, unknown>>();

  register<TCommand extends ICommand, TResult>(
    type: string,
    handler: ICommandHandler<TCommand, TResult>,
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`A handler is already registered for command "${type}"`);
    }
    this.handlers.set(type, handler as ICommandHandler<ICommand, unknown>);
  }

  async execute<TCommand extends ICommand, TResult = void>(command: TCommand): Promise<TResult> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command "${command.type}"`);
    }
    return handler.execute(command) as Promise<TResult>;
  }
}
