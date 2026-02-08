import type {
  RpcEndpoint,
  RpcHandlerMap,
  RpcRequestByType,
  RpcRequestUnion,
  RpcResponseByRequest,
  RpcResponseByType,
} from "./rpc.ts";

type PageNumberInput = number | string | null;

export type ChunkAnchorWeight = {
  id: string;
  weight: number;
};

type ChunkAnchorWeightsInput = ChunkAnchorWeight[] | null;

export type PingRequest = {
  type: "ping";
};

export type PingResponse =
  | {
      ok: true;
    }
  | {
      error: string;
    };

export type GetPageContentRequest = {
  type: "getPageContent";
  pageNumber?: PageNumberInput;
  page_number?: PageNumberInput;
};

export type GetPageContentResponse = {
  title?: string;
  url?: string;
  content?: string;
  totalPages?: number;
  pageNumber?: number;
  viewportPage?: number;
  chunkAnchorWeights?: ChunkAnchorWeight[];
  totalTokens?: number;
  error?: string;
};

export type PageContentChunk = {
  pageNumber?: number;
  content?: string;
};

export type GetAllPageContentRequest = {
  type: "getAllPageContent";
};

export type GetAllPageContentResponse = {
  title?: string;
  url?: string;
  totalPages?: number;
  pages?: PageContentChunk[];
  error?: string;
};

export type SetPageHashRequest = {
  type: "setPageHash";
  pageNumber?: PageNumberInput;
  page_number?: PageNumberInput;
  totalPages?: PageNumberInput;
  total_pages?: PageNumberInput;
  viewportPage?: PageNumberInput;
  viewport_page?: PageNumberInput;
  chunkAnchorWeights?: ChunkAnchorWeightsInput;
  chunk_anchor_weights?: ChunkAnchorWeightsInput;
};

export type SetPageHashResponse = {
  ok?: boolean;
  skipped?: boolean;
  shouldReload?: boolean;
  reload?: boolean;
  pageNumber?: number;
  totalPages?: number;
  error?: string;
};

export type ClickButtonRequest = {
  type: "clickButton";
  id?: string | null;
};

export type ClickButtonResponse = {
  ok?: boolean;
  pageNumber?: number;
  error?: string;
};

export type EnterTextRequest = {
  type: "enterText";
  id?: string | null;
  content?: string | null;
};

export type EnterTextResponse = {
  ok?: boolean;
  error?: string;
  reason?: string;
};

export type ContentScriptRpcSchema = {
  ping: RpcEndpoint<PingRequest, PingResponse>;
  getPageContent: RpcEndpoint<GetPageContentRequest, GetPageContentResponse>;
  getAllPageContent: RpcEndpoint<
    GetAllPageContentRequest,
    GetAllPageContentResponse
  >;
  setPageHash: RpcEndpoint<SetPageHashRequest, SetPageHashResponse>;
  clickButton: RpcEndpoint<ClickButtonRequest, ClickButtonResponse>;
  enterText: RpcEndpoint<EnterTextRequest, EnterTextResponse>;
};

export type ContentScriptRequestType = keyof ContentScriptRpcSchema;

export type ContentScriptRequest = RpcRequestUnion<ContentScriptRpcSchema>;

export type ContentScriptRequestByType<TType extends ContentScriptRequestType> =
  RpcRequestByType<ContentScriptRpcSchema, TType>;

export type ContentScriptResponseByType<
  TType extends ContentScriptRequestType,
> = RpcResponseByType<ContentScriptRpcSchema, TType>;

export type ContentScriptResponseByRequest<
  TRequest extends ContentScriptRequest,
> = RpcResponseByRequest<ContentScriptRpcSchema, TRequest>;

export type ContentScriptRpcHandlerMap = RpcHandlerMap<ContentScriptRpcSchema>;

const contentScriptRequestTypeMap: Record<ContentScriptRequestType, true> = {
  clickButton: true,
  enterText: true,
  getAllPageContent: true,
  getPageContent: true,
  ping: true,
  setPageHash: true,
};

type MessageLike = {
  type?: string;
};

type RuntimeValue = object | string | number | boolean | null;

const isMessageLike = (value: RuntimeValue): value is MessageLike => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const isContentScriptRequestType = (
  value: string,
): value is ContentScriptRequestType => {
  return value in contentScriptRequestTypeMap;
};

export const isContentScriptRequest = (
  value: RuntimeValue,
): value is ContentScriptRequest => {
  if (!isMessageLike(value)) {
    return false;
  }
  if (typeof value.type !== "string") {
    return false;
  }
  return isContentScriptRequestType(value.type);
};
