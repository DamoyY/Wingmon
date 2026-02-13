export type RpcErrorResponse = {
  error: string;
};

export type RpcEndpoint<
  TRequest extends { type: string },
  TResponse extends object,
> = {
  request: TRequest;
  response: TResponse;
};

export type RpcSchema = Record<string, RpcEndpoint<{ type: string }, object>>;

export type RpcRequestUnion<TSchema extends RpcSchema> = {
  [TType in keyof TSchema & string]: TSchema[TType]["request"];
}[keyof TSchema & string];

export type RpcRequestByType<
  TSchema extends RpcSchema,
  TType extends keyof TSchema & string,
> = Extract<RpcRequestUnion<TSchema>, { type: TType }>;

export type RpcResponseByType<
  TSchema extends RpcSchema,
  TType extends keyof TSchema & string,
> = TSchema[TType]["response"];

export type RpcResponseByRequest<
  TSchema extends RpcSchema,
  TRequest extends RpcRequestUnion<TSchema>,
> = RpcResponseByType<TSchema, TRequest["type"] & keyof TSchema & string>;

export type RpcHandler<
  TSchema extends RpcSchema,
  TType extends keyof TSchema & string,
> = (
  message: RpcRequestByType<TSchema, TType>,
  sendResponse: (response: RpcResponseByType<TSchema, TType>) => void,
) => void | Promise<void>;

export type RpcHandlerMap<TSchema extends RpcSchema> = {
  [TType in keyof TSchema & string]: RpcHandler<TSchema, TType>;
};
