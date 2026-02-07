import type { BrowserTab, CreatedBrowserTab } from "../services/index.ts";
import { parseJson, type JsonValue } from "../../lib/utils/index.ts";
import {
  extractErrorMessage,
  type ChunkAnchorWeight,
  type ContentScriptRequest,
  type ContentScriptResponseByRequest,
} from "../../../shared/index.ts";
import toolModules from "./tools/index.ts";
import type { PageMarkdownData } from "./pageReadHelpers.ts";
import ToolInputError from "./errors.ts";

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
  chunkAnchorWeights?: ChunkAnchorWeight[];
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

const ensureToolName = (
    value: string | undefined,
    key: ToolNameKey,
  ): string => {
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
    find: ensureToolName(names.find, "find"),
    getPageMarkdown: ensureToolName(names.getPageMarkdown, "getPageMarkdown"),
    listTabs: ensureToolName(names.listTabs, "listTabs"),
    openBrowserPage: ensureToolName(names.openBrowserPage, "openBrowserPage"),
    runConsoleCommand: ensureToolName(
      names.runConsoleCommand,
      "runConsoleCommand",
    ),
    showHtml: ensureToolName(names.showHtml, "showHtml"),
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
  const normalized: ToolModule = {
    key,
    name,
    description,
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
