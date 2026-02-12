import type {
  RpcEndpoint,
  RpcHandlerMap,
  RpcRequestByType,
  RpcRequestUnion,
  RpcResponseByRequest,
  RpcResponseByType,
} from "./rpc.ts";

export type ChunkAnchorWeight = {
  id: string;
  weight: number;
};

export type ButtonChunkPage = {
  id: string;
  pageNumber: number;
};

export type InputChunkPage = {
  id: string;
  pageNumber: number;
};

type ContentScriptErrorResponse = {
  error: string;
};

export type PingRequest = {
  type: "ping";
};

export type PingResponse = { ok: true } | ContentScriptErrorResponse;

export type GetPageContentRequest = {
  type: "getPageContent";
  tabId: number;
  pageNumber?: number;
  locateViewportCenter?: boolean;
};

export type GetPageContentSuccessResponse = {
  title: string;
  url: string;
  content: string;
  totalPages: number;
  pageNumber: number;
  viewportPage: number;
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
  buttonChunkPages?: readonly ButtonChunkPage[];
  inputChunkPages?: readonly InputChunkPage[];
  totalTokens?: number;
};

export type PageContentChunk = {
  pageNumber: number;
  content: string;
};

export type GetAllPageContentRequest = {
  type: "getAllPageContent";
  tabId: number;
};

export type GetAllPageContentSuccessResponse = {
  title: string;
  url: string;
  totalPages: number;
  pages: readonly PageContentChunk[];
};

export type SetPageHashRequest = {
  type: "setPageHash";
  tabId: number;
  pageNumber?: number;
  totalPages?: number;
  chunkAnchorWeights?: readonly ChunkAnchorWeight[];
};

export type SetPageHashSuccessResponse = {
  ok: true;
  skipped: boolean;
  shouldReload: boolean;
  pageNumber: number;
  totalPages?: number;
};

export type ClickButtonRequest = {
  type: "clickButton";
  id: string;
};

export type ClickButtonResponse =
  | {
      ok: true;
      pageNumber?: number;
    }
  | {
      ok: false;
      reason: "not_found";
    }
  | ContentScriptErrorResponse;

export type EnterTextRequest = {
  type: "enterText";
  id: string;
  content: string;
};

export type EnterTextResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not_found";
    }
  | ContentScriptErrorResponse;

export type GetPageContentResponse =
  | GetPageContentSuccessResponse
  | ContentScriptErrorResponse;
export type GetAllPageContentResponse =
  | GetAllPageContentSuccessResponse
  | ContentScriptErrorResponse;
export type SetPageHashResponse =
  | SetPageHashSuccessResponse
  | ContentScriptErrorResponse;

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

type RuntimeValue = object | string | number | boolean | null | undefined;
type MessageLike = Record<string, RuntimeValue>;

const llmIdPattern = /^[0-9a-z]+$/u;
const pingRequestKeys = new Set(["type"]);
const getPageContentRequestKeys = new Set([
  "locateViewportCenter",
  "pageNumber",
  "tabId",
  "type",
]);
const getAllPageContentRequestKeys = new Set(["tabId", "type"]);
const setPageHashRequestKeys = new Set([
  "chunkAnchorWeights",
  "pageNumber",
  "tabId",
  "totalPages",
  "type",
]);
const clickButtonRequestKeys = new Set(["id", "type"]);
const enterTextRequestKeys = new Set(["content", "id", "type"]);
const chunkAnchorWeightKeys = new Set(["id", "weight"]);

const isMessageLike = (value: RuntimeValue): value is MessageLike => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const hasOnlyKeys = (
  value: MessageLike,
  allowedKeys: ReadonlySet<string>,
): boolean => {
  return Object.keys(value).every((key) => allowedKeys.has(key));
};

const isPositiveInteger = (value: RuntimeValue): value is number => {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
};

const isRuntimeArray = (value: RuntimeValue): value is RuntimeValue[] => {
  return Array.isArray(value);
};

const isOptionalFieldValid = (
  value: MessageLike,
  fieldName: string,
  validator: (fieldValue: RuntimeValue) => boolean,
): boolean => {
  if (!(fieldName in value)) {
    return true;
  }
  const fieldValue = value[fieldName];
  if (fieldValue === undefined) {
    return true;
  }
  return validator(fieldValue);
};

const isValidLlmId = (value: RuntimeValue): value is string => {
  return typeof value === "string" && llmIdPattern.test(value.trim());
};

const isChunkAnchorWeight = (
  value: RuntimeValue,
): value is ChunkAnchorWeight => {
  if (!isMessageLike(value) || !hasOnlyKeys(value, chunkAnchorWeightKeys)) {
    return false;
  }
  if (!isValidLlmId(value.id)) {
    return false;
  }
  return isPositiveInteger(value.weight);
};

const isOptionalChunkAnchorWeightsField = (
  value: MessageLike,
  fieldName: string,
): boolean => {
  if (!(fieldName in value)) {
    return true;
  }
  const fieldValue = value[fieldName];
  if (fieldValue === undefined) {
    return true;
  }
  if (!isRuntimeArray(fieldValue)) {
    return false;
  }
  const usedIds = new Set<string>();
  for (const item of fieldValue) {
    if (!isChunkAnchorWeight(item)) {
      return false;
    }
    const normalizedId = item.id.trim().toLowerCase();
    if (usedIds.has(normalizedId)) {
      return false;
    }
    usedIds.add(normalizedId);
  }
  return true;
};

export const isContentScriptRequestType = (
  value: string,
): value is ContentScriptRequestType => {
  return value in contentScriptRequestTypeMap;
};

const isPingRequest = (value: MessageLike): value is PingRequest => {
  return value.type === "ping" && hasOnlyKeys(value, pingRequestKeys);
};

const isGetPageContentRequest = (
  value: MessageLike,
): value is GetPageContentRequest => {
  if (
    value.type !== "getPageContent" ||
    !hasOnlyKeys(value, getPageContentRequestKeys)
  ) {
    return false;
  }
  if (!isPositiveInteger(value.tabId)) {
    return false;
  }
  if (
    !isOptionalFieldValid(value, "pageNumber", (fieldValue) =>
      isPositiveInteger(fieldValue),
    )
  ) {
    return false;
  }
  return isOptionalFieldValid(value, "locateViewportCenter", (fieldValue) => {
    return typeof fieldValue === "boolean";
  });
};

const isGetAllPageContentRequest = (
  value: MessageLike,
): value is GetAllPageContentRequest => {
  if (
    value.type !== "getAllPageContent" ||
    !hasOnlyKeys(value, getAllPageContentRequestKeys)
  ) {
    return false;
  }
  return isPositiveInteger(value.tabId);
};

const isSetPageHashRequest = (
  value: MessageLike,
): value is SetPageHashRequest => {
  if (
    value.type !== "setPageHash" ||
    !hasOnlyKeys(value, setPageHashRequestKeys)
  ) {
    return false;
  }
  if (!isPositiveInteger(value.tabId)) {
    return false;
  }
  if (
    !isOptionalFieldValid(value, "pageNumber", (fieldValue) =>
      isPositiveInteger(fieldValue),
    )
  ) {
    return false;
  }
  if (
    !isOptionalFieldValid(value, "totalPages", (fieldValue) =>
      isPositiveInteger(fieldValue),
    )
  ) {
    return false;
  }
  return isOptionalChunkAnchorWeightsField(value, "chunkAnchorWeights");
};

const isClickButtonRequest = (
  value: MessageLike,
): value is ClickButtonRequest => {
  if (
    value.type !== "clickButton" ||
    !hasOnlyKeys(value, clickButtonRequestKeys)
  ) {
    return false;
  }
  return isValidLlmId(value.id);
};

const isEnterTextRequest = (value: MessageLike): value is EnterTextRequest => {
  if (value.type !== "enterText" || !hasOnlyKeys(value, enterTextRequestKeys)) {
    return false;
  }
  if (!isValidLlmId(value.id)) {
    return false;
  }
  return typeof value.content === "string";
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
  if (!isContentScriptRequestType(value.type)) {
    return false;
  }
  switch (value.type) {
    case "ping":
      return isPingRequest(value);
    case "getPageContent":
      return isGetPageContentRequest(value);
    case "getAllPageContent":
      return isGetAllPageContentRequest(value);
    case "setPageHash":
      return isSetPageHashRequest(value);
    case "clickButton":
      return isClickButtonRequest(value);
    case "enterText":
      return isEnterTextRequest(value);
    default:
      return false;
  }
};
