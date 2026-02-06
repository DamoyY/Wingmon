import type { BrowserTab, CreatedBrowserTab } from "../services/index.ts";
import { parseJson, type JsonValue } from "../../lib/utils/index.ts";
import type {
  ContentScriptRequest,
  ContentScriptResponseByRequest,
} from "../../../shared/index.ts";
import toolModules from "./modules/index.ts";
import type { PageMarkdownData } from "./pageReadHelpers.ts";
import ToolInputError from "./errors.ts";

const TOOL_STRICT = true;

const toolNameKeys = [
  "clickButton",
  "closeBrowserPage",
  "enterText",
  "getPageMarkdown",
  "listTabs",
  "openBrowserPage",
  "runConsoleCommand",
  "showHtml",
] as const;

export type ToolNameKey = (typeof toolNameKeys)[number];

export type ToolNameMap = Record<ToolNameKey, string>;

type ToolParameters = Record<string, JsonValue>;

export type ToolPageReadDedupeAction = "removeToolCall" | "trimToolResponse";

export type ToolPageReadEvent = {
  tabId: number;
  pageNumber?: number;
  url?: string;
};

export type ToolMessageContext = {
  pageReadEvent?: ToolPageReadEvent;
};

export type ToolPageHashData = {
  pageNumber?: number;
  totalPages?: number;
  viewportPage?: number;
  chunkAnchorId?: string;
};

export type ToolExecutionContext = {
  getAllTabs: () => Promise<BrowserTab[]>;
  waitForContentScript: (tabId: number) => Promise<boolean>;
  sendMessageToTab: <TRequest extends ContentScriptRequest>(
    tabId: number,
    payload: TRequest,
  ) => Promise<ContentScriptResponseByRequest<TRequest>>;
  closeTab: (tabId: number) => Promise<void>;
  focusTab: (tabId: number) => Promise<void>;
  createTab: (url: string, active: boolean) => Promise<CreatedBrowserTab>;
  fetchPageMarkdownData: (
    tabId: number,
    pageNumber?: number,
  ) => Promise<PageMarkdownData>;
  shouldFollowMode: () => Promise<boolean>;
  syncPageHash: (tabId: number, pageData?: ToolPageHashData) => Promise<void>;
  sendMessageToSandbox: (
    payload: Record<string, JsonValue>,
    timeoutMs?: number,
  ) => Promise<JsonValue>;
  saveHtmlPreview: (args: { code: string }) => Promise<string>;
  getRuntimeUrl: (path: string) => string;
};

type RawToolModule = {
  key?: string;
  name?: string;
  description?: string;
  parameters?: ToolParameters;
  execute?: (
    args: JsonValue,
    context: ToolExecutionContext,
  ) => JsonValue | Promise<JsonValue>;
  validateArgs?: (args: JsonValue) => JsonValue;
  formatResult?: (result: JsonValue) => string;
  buildMessageContext?: (
    args: JsonValue,
    result: JsonValue,
  ) => ToolMessageContext | null;
  pageReadDedupeAction?: ToolPageReadDedupeAction;
};

type ToolCallFunction = {
  name?: string;
  arguments?: string;
};

export type ToolCallArguments = string | JsonValue;

export type ToolCall = {
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: ToolCallArguments;
  function?: ToolCallFunction;
};

type ToolCallInput = ToolCall | null | undefined;

export type ToolModule<TArgs = JsonValue, TResult = JsonValue> = {
  key?: ToolNameKey;
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (
    args: TArgs,
    context: ToolExecutionContext,
  ) => TResult | Promise<TResult>;
  validateArgs: (args: JsonValue) => TArgs;
  formatResult?: (result: TResult) => string;
  buildMessageContext?: (
    args: TArgs,
    result: TResult,
  ) => ToolMessageContext | null;
  pageReadDedupeAction?: ToolPageReadDedupeAction;
};

export type ToolValidator<TArgs = JsonValue> = (args: JsonValue) => TArgs;

type ToolDefinitionFunction = {
  name: string;
  description: string;
  parameters: ToolParameters;
  strict: boolean;
};

type ChatToolDefinition = {
  type: "function";
  function: ToolDefinitionFunction;
};

type ResponsesToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: ToolParameters;
  strict: boolean;
};

export type ToolDefinition = ChatToolDefinition | ResponsesToolDefinition;

const toolNameKeySet = new Set<string>(toolNameKeys),
  pageReadDedupeActionSet = new Set<ToolPageReadDedupeAction>([
    "removeToolCall",
    "trimToolResponse",
  ]),
  isRecord = (
    value: JsonValue | RawToolModule | null,
  ): value is ToolParameters =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  isToolNameKey = (value: string): value is ToolNameKey =>
    toolNameKeySet.has(value),
  ensureRawToolModules = (value: RawToolModule[]): RawToolModule[] => {
    if (!Array.isArray(value)) {
      throw new Error("工具模块列表无效");
    }
    return value;
  },
  ensureToolName = (value: string | undefined, key: ToolNameKey): string => {
    if (!value) {
      throw new Error(`工具 key 缺失：${key}`);
    }
    return value;
  },
  resolveToolNames = (names: Partial<ToolNameMap>): ToolNameMap => ({
    clickButton: ensureToolName(names.clickButton, "clickButton"),
    closeBrowserPage: ensureToolName(
      names.closeBrowserPage,
      "closeBrowserPage",
    ),
    enterText: ensureToolName(names.enterText, "enterText"),
    getPageMarkdown: ensureToolName(names.getPageMarkdown, "getPageMarkdown"),
    listTabs: ensureToolName(names.listTabs, "listTabs"),
    openBrowserPage: ensureToolName(names.openBrowserPage, "openBrowserPage"),
    runConsoleCommand: ensureToolName(
      names.runConsoleCommand,
      "runConsoleCommand",
    ),
    showHtml: ensureToolName(names.showHtml, "showHtml"),
  }),
  resolveErrorMessage = (error: Error | null | undefined): string => {
    if (error && error.message.trim()) {
      return error.message;
    }
    return "工具参数解析失败";
  };

const validatedTools: ToolModule[] = [],
  toolModuleByName = new Map<string, ToolModule>(),
  resolvedToolNames: Partial<ToolNameMap> = {},
  rawToolModules = ensureRawToolModules(toolModules);

rawToolModules.forEach((tool) => {
  if (typeof tool.name !== "string" || !tool.name.trim()) {
    throw new Error("工具缺少 name");
  }
  const name = tool.name.trim();
  if (toolModuleByName.has(name)) {
    throw new Error(`重复的工具 name：${name}`);
  }
  if (typeof tool.description !== "string" || !tool.description.trim()) {
    throw new Error(`工具 ${name} 缺少 description`);
  }
  if (!isRecord(tool.parameters)) {
    throw new Error(`工具 ${name} 缺少 parameters`);
  }
  if (typeof tool.execute !== "function") {
    throw new Error(`工具 ${name} 缺少 execute`);
  }
  if (typeof tool.validateArgs !== "function") {
    throw new Error(`工具 ${name} 缺少 validateArgs`);
  }
  if (
    tool.formatResult !== undefined &&
    typeof tool.formatResult !== "function"
  ) {
    throw new Error(`工具 ${name} formatResult 无效`);
  }
  if (
    tool.buildMessageContext !== undefined &&
    typeof tool.buildMessageContext !== "function"
  ) {
    throw new Error(`工具 ${name} buildMessageContext 无效`);
  }
  if (
    tool.pageReadDedupeAction !== undefined &&
    !pageReadDedupeActionSet.has(tool.pageReadDedupeAction)
  ) {
    throw new Error(`工具 ${name} pageReadDedupeAction 无效`);
  }
  let key: ToolNameKey | undefined;
  if (tool.key !== undefined) {
    if (typeof tool.key !== "string" || !tool.key.trim()) {
      throw new Error(`工具 ${name} key 无效`);
    }
    const normalizedKey = tool.key.trim();
    if (!isToolNameKey(normalizedKey)) {
      throw new Error(`工具 ${name} key 未注册：${normalizedKey}`);
    }
    if (resolvedToolNames[normalizedKey]) {
      throw new Error(`重复的工具 key：${normalizedKey}`);
    }
    resolvedToolNames[normalizedKey] = name;
    key = normalizedKey;
  }
  const normalized: ToolModule = {
    key,
    name,
    description: tool.description.trim(),
    parameters: tool.parameters,
    execute: tool.execute,
    validateArgs: tool.validateArgs,
    formatResult: tool.formatResult,
    buildMessageContext: tool.buildMessageContext,
    pageReadDedupeAction: tool.pageReadDedupeAction,
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
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    };
  }
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    },
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
    const resolvedError = error instanceof Error ? error : undefined;
    throw new ToolInputError(resolveErrorMessage(resolvedError));
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
  if (typeof tool.validateArgs !== "function") {
    throw new ToolInputError(`工具 ${name} 缺少参数校验`);
  }
  return tool.validateArgs;
};

export type { JsonValue };
