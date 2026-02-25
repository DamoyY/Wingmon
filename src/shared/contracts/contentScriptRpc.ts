import type {
  RpcEndpoint,
  RpcHandlerMap,
  RpcRequestByType,
  RpcRequestUnion,
  RpcResponseByRequest,
  RpcResponseByType,
} from "./rpc.ts";
import {
  type JsonSchema,
  isJsonSchemaValue,
  isJsonValue,
  isRecord,
} from "../utils/runtimeValidation.ts";

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
  pressEnter: boolean;
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

export type SetFocusRippleRequest = {
  type: "setFocusRipple";
  enabled: boolean;
};

export type SetFocusRippleResponse =
  | {
      ok: true;
      enabled: boolean;
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
  setFocusRipple: RpcEndpoint<SetFocusRippleRequest, SetFocusRippleResponse>;
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
  setFocusRipple: true,
  setPageHash: true,
};

type RuntimeValue = object | string | number | boolean | null | undefined;

const llmIdPattern = String.raw`^\s*[0-9a-z]+\s*$`;

const chunkAnchorWeightSchema: JsonSchema = {
  additionalProperties: false,
  properties: {
    id: {
      pattern: llmIdPattern,
      type: "string",
    },
    weight: {
      minimum: 1,
      type: "integer",
    },
  },
  required: ["id", "weight"],
  type: "object",
};

const contentScriptRequestSchemaMap: Record<
  ContentScriptRequestType,
  JsonSchema
> = {
  clickButton: {
    additionalProperties: false,
    properties: {
      id: {
        pattern: llmIdPattern,
        type: "string",
      },
      type: { type: "string" },
    },
    required: ["type", "id"],
    type: "object",
  },
  enterText: {
    additionalProperties: false,
    properties: {
      content: { type: "string" },
      id: {
        pattern: llmIdPattern,
        type: "string",
      },
      pressEnter: { type: "boolean" },
      type: { type: "string" },
    },
    required: ["type", "id", "content", "pressEnter"],
    type: "object",
  },
  getAllPageContent: {
    additionalProperties: false,
    properties: {
      tabId: {
        minimum: 1,
        type: "integer",
      },
      type: { type: "string" },
    },
    required: ["type", "tabId"],
    type: "object",
  },
  getPageContent: {
    additionalProperties: false,
    properties: {
      locateViewportCenter: { type: "boolean" },
      pageNumber: {
        minimum: 1,
        type: "integer",
      },
      tabId: {
        minimum: 1,
        type: "integer",
      },
      type: { type: "string" },
    },
    required: ["type", "tabId"],
    type: "object",
  },
  ping: {
    additionalProperties: false,
    properties: {
      type: { type: "string" },
    },
    required: ["type"],
    type: "object",
  },
  setFocusRipple: {
    additionalProperties: false,
    properties: {
      enabled: { type: "boolean" },
      type: { type: "string" },
    },
    required: ["type", "enabled"],
    type: "object",
  },
  setPageHash: {
    additionalProperties: false,
    properties: {
      chunkAnchorWeights: {
        items: chunkAnchorWeightSchema,
        type: "array",
      },
      pageNumber: {
        minimum: 1,
        type: "integer",
      },
      tabId: {
        minimum: 1,
        type: "integer",
      },
      totalPages: {
        minimum: 1,
        type: "integer",
      },
      type: { type: "string" },
    },
    required: ["type", "tabId"],
    type: "object",
  },
};

const hasUniqueChunkAnchorWeightIds = (
  chunkAnchorWeights: SetPageHashRequest["chunkAnchorWeights"],
): boolean => {
  if (!chunkAnchorWeights) {
    return true;
  }
  const usedIds = new Set<string>();
  for (const item of chunkAnchorWeights) {
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

export const isContentScriptRequest = (
  value: RuntimeValue,
): value is ContentScriptRequest => {
  if (!isJsonValue(value) || !isRecord(value)) {
    return false;
  }
  const requestType = value.type;
  if (typeof requestType !== "string") {
    return false;
  }
  if (!isContentScriptRequestType(requestType)) {
    return false;
  }
  const requestSchema = contentScriptRequestSchemaMap[requestType];
  if (!isJsonSchemaValue(value, requestSchema)) {
    return false;
  }
  if (requestType !== "setPageHash") {
    return true;
  }
  const setPageHashRequest = value as SetPageHashRequest;
  return hasUniqueChunkAnchorWeightIds(setPageHashRequest.chunkAnchorWeights);
};
