import type {
  ApiType,
  BrowserTab,
  CreatedBrowserTab,
  SandboxConsoleCommandRequest,
  SandboxConsoleCommandResponse,
} from "../services/index.ts";
import {
  type ChunkAnchorWeight,
  type ContentScriptRequest,
  type ContentScriptResponseByRequest,
  extractErrorMessage,
} from "../../../shared/index.ts";
import { type JsonValue, parseJson } from "../../lib/utils/index.ts";
import {
  type ToolJsonSchema,
  createToolArgsValidator,
} from "./validation/index.js";
import type { PageMarkdownData } from "./pageReadHelpers.ts";
import type { ToolImageInput } from "./toolResultTypes.ts";
import ToolInputError from "./errors.ts";
import toolModules from "./tools/index.ts";

const TOOL_STRICT = true;

export type ToolNameKey =
  | "clickButton"
  | "closeBrowserPage"
  | "enterText"
  | "find"
  | "getPageMarkdown"
  | "listTabs"
  | "openBrowserPage"
  | "runConsoleCommand"
  | "showHtml";

export type ToolNameMap = Record<ToolNameKey, string>;

type ToolParameters = ToolJsonSchema;

export type ToolPageReadDedupeAction = "removeToolCall" | "trimToolResponse";

export type ToolPageReadEvent = {
  tabId: number;
  pageNumber?: number;
  url?: string;
};

export type ToolMessageContext = {
  pageReadEvent?: ToolPageReadEvent;
  outputWithoutContent?: string;
  imageInput?: ToolImageInput;
};

export type ToolPageHashData = {
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
  chunkAnchorWeights?: ChunkAnchorWeight[];
};

export type ToolExecutionContext = {
  getApiType: () => Promise<ApiType>;
  closeTab: (tabId: number) => Promise<void>;
  createTab: (url: string, active: boolean) => Promise<CreatedBrowserTab>;
  fetchPageMarkdownData: (
    tabId: number,
    pageNumber?: number,
    options?: { locateViewportCenter?: boolean },
  ) => Promise<PageMarkdownData>;
  focusTab: (tabId: number) => Promise<void>;
  getAllTabs: () => Promise<BrowserTab[]>;
  getRuntimeUrl: (path: string) => string;
  saveHtmlPreview: (args: { code: string }) => Promise<string>;
  setTabGroupCollapsed: (tabId: number, collapsed: boolean) => Promise<void>;
  sendMessageToSandbox: (
    payload: SandboxConsoleCommandRequest,
    timeoutMs?: number,
  ) => Promise<SandboxConsoleCommandResponse>;
  sendMessageToTab: <TRequest extends ContentScriptRequest>(
    tabId: number,
    payload: TRequest,
  ) => Promise<ContentScriptResponseByRequest<TRequest>>;
  shouldFollowMode: () => Promise<boolean>;
  syncPageHash: (tabId: number, pageData?: ToolPageHashData) => Promise<void>;
  waitForContentScript: (tabId: number) => Promise<boolean>;
};

type ToolCallFunction = { arguments?: string; name?: string };

export type ToolCallArguments = string | JsonValue;

export type ToolCall = {
  arguments?: ToolCallArguments;
  call_id?: string;
  function?: ToolCallFunction;
  id?: string;
  name?: string;
};

type ToolCallInput = ToolCall | null | undefined;

export type ToolModule<TArgs = JsonValue, TResult = JsonValue> = {
  buildMessageContext?: (
    args: TArgs,
    result: TResult,
  ) => ToolMessageContext | null;
  description: string;
  execute: (
    args: TArgs,
    context: ToolExecutionContext,
  ) => TResult | Promise<TResult>;
  formatResult?: (result: TResult) => string;
  key?: ToolNameKey;
  name: string;
  pageReadDedupeAction?: ToolPageReadDedupeAction;
  parameters: ToolParameters;
  validateArgs: (args: JsonValue) => TArgs;
};

export type ToolValidator<TArgs = JsonValue> = (args: JsonValue) => TArgs;

type ToolDefinitionFunction = {
  description: string;
  name: string;
  parameters: ToolParameters;
  strict: boolean;
};

type ChatToolDefinition = {
  function: ToolDefinitionFunction;
  type: "function";
};

type ResponsesToolDefinition = {
  description: string;
  name: string;
  parameters: ToolParameters;
  strict: boolean;
  type: "function";
};

export type ToolDefinition = ChatToolDefinition | ResponsesToolDefinition;

const ensureToolName = (
    key: ToolNameKey,
    value: string | undefined,
  ): string => {
    if (!value) {
      throw new Error(`工具 key 缺失：${key}`);
    }
    return value;
  },
  resolveToolNames = (names: Partial<ToolNameMap>): ToolNameMap => ({
    clickButton: ensureToolName("clickButton", names.clickButton),
    closeBrowserPage: ensureToolName(
      "closeBrowserPage",
      names.closeBrowserPage,
    ),
    enterText: ensureToolName("enterText", names.enterText),
    find: ensureToolName("find", names.find),
    getPageMarkdown: ensureToolName("getPageMarkdown", names.getPageMarkdown),
    listTabs: ensureToolName("listTabs", names.listTabs),
    openBrowserPage: ensureToolName("openBrowserPage", names.openBrowserPage),
    runConsoleCommand: ensureToolName(
      "runConsoleCommand",
      names.runConsoleCommand,
    ),
    showHtml: ensureToolName("showHtml", names.showHtml),
  });

const validatedTools: ToolModule[] = [],
  toolModuleByName = new Map<string, ToolModule>(),
  resolvedToolNames: Partial<ToolNameMap> = {};

toolModules.forEach((tool) => {
  const name = tool.name.trim();
  if (!name) {
    throw new Error("工具缺少 name");
  }
  if (toolModuleByName.has(name)) {
    throw new Error(`重复的工具 name：${name}`);
  }
  const description = tool.description.trim();
  if (!description) {
    throw new Error(`工具 ${name} 缺少 description`);
  }
  const key = tool.key;
  if (key !== undefined) {
    if (resolvedToolNames[key]) {
      throw new Error(`重复的工具 key：${key}`);
    }
    resolvedToolNames[key] = name;
  }
  const schemaArgsValidator = createToolArgsValidator(tool.parameters),
    validateArgs = (args: JsonValue): JsonValue => {
      const schemaValidatedArgs = schemaArgsValidator(args),
        customValidateArgs = tool.validateArgs;
      if (typeof customValidateArgs === "function") {
        return customValidateArgs(schemaValidatedArgs);
      }
      return schemaValidatedArgs;
    };
  const normalized: ToolModule = {
    buildMessageContext: tool.buildMessageContext,
    description,
    execute: tool.execute,
    formatResult: tool.formatResult,
    key,
    name,
    pageReadDedupeAction: tool.pageReadDedupeAction,
    parameters: tool.parameters,
    validateArgs,
  };
  toolModuleByName.set(name, normalized);
  validatedTools.push(normalized);
});

export const toolNames = Object.freeze(resolveToolNames(resolvedToolNames));

const buildToolDefinition = (
  tool: ToolModule,
  useResponsesFormat: boolean,
): ToolDefinition => {
  if (useResponsesFormat) {
    return {
      description: tool.description,
      name: tool.name,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
      type: "function",
    };
  }
  return {
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    },
    type: "function",
  };
};

export const getToolDefinitions = (apiType: string): ToolDefinition[] => {
  const useResponsesFormat = apiType === "responses";
  return validatedTools.map((tool) =>
    buildToolDefinition(tool, useResponsesFormat),
  );
};

export const parseToolArguments = (text: string): JsonValue => {
  try {
    return parseJson(text);
  } catch (error) {
    throw new ToolInputError(
      extractErrorMessage(error, { fallback: "工具参数解析失败" }),
    );
  }
};

export const getToolCallArguments = (call: ToolCallInput): ToolCallArguments =>
  call?.function?.arguments ?? call?.arguments ?? "";

export const getToolCallId = (call: ToolCallInput): string => {
  const callId = call?.call_id || call?.id;
  if (!callId) {
    throw new ToolInputError("工具调用缺少 call_id");
  }
  return callId;
};

export const getToolCallName = (call: ToolCallInput): string => {
  const name = call?.function?.name || call?.name;
  if (!name) {
    throw new ToolInputError("工具调用缺少 name");
  }
  return name;
};

export const getToolModule = <TArgs = JsonValue, TResult = JsonValue>(
  name: string,
): ToolModule<TArgs, TResult> => {
  const tool = toolModuleByName.get(name);
  if (!tool) {
    throw new ToolInputError(`未支持的工具：${name}`);
  }
  return tool as ToolModule<TArgs, TResult>;
};

export const getToolValidator = <TArgs = JsonValue>(
  name: string,
): ToolValidator<TArgs> => {
  const tool = getToolModule<TArgs>(name);
  return tool.validateArgs;
};

export type { JsonValue };
