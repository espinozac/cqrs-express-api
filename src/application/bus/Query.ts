export interface IQuery {
  readonly type: string;
}

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}

export class QueryBus {
  private handlers = new Map<string, IQueryHandler<IQuery, unknown>>();

  register<TQuery extends IQuery, TResult>(
    type: string,
    handler: IQueryHandler<TQuery, TResult>,
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`A handler is already registered for query "${type}"`);
    }
    this.handlers.set(type, handler as IQueryHandler<IQuery, unknown>);
  }

  async execute<TQuery extends IQuery, TResult>(query: TQuery): Promise<TResult> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No handler registered for query "${query.type}"`);
    }
    return handler.execute(query) as Promise<TResult>;
  }
}
