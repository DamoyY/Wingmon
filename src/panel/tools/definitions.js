import { parseJson } from "../utils/index.ts";
import toolModules from "./modules/index.js";
import ToolInputError from "./errors.js";

const TOOL_STRICT = true,
  validatedTools = [],
  toolModuleByName = new Map(),
  toolNames = {};
toolModules.forEach((tool) => {
  if (!tool || typeof tool !== "object") {
    throw new Error("工具模块无效");
  }
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
  if (!tool.parameters || typeof tool.parameters !== "object") {
    throw new Error(`工具 ${name} 缺少 parameters`);
  }
  if (typeof tool.execute !== "function") {
    throw new Error(`工具 ${name} 缺少 execute`);
  }
  if (typeof tool.validateArgs !== "function") {
    throw new Error(`工具 ${name} 缺少 validateArgs`);
  }
  if (tool.key !== undefined) {
    if (typeof tool.key !== "string" || !tool.key.trim()) {
      throw new Error(`工具 ${name} key 无效`);
    }
    if (toolNames[tool.key]) {
      throw new Error(`重复的工具 key：${tool.key}`);
    }
    toolNames[tool.key] = name;
  }
  const normalized = { ...tool, name };
  toolModuleByName.set(name, normalized);
  validatedTools.push(normalized);
});

export { toolNames };

const buildToolDefinition = (tool, useResponsesFormat) => {
  const { description } = tool;
  if (!description) {
    throw new Error(`工具 ${tool.name} 缺少 description`);
  }
  if (useResponsesFormat) {
    return {
      type: "function",
      name: tool.name,
      description,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    };
  }
  return {
    type: "function",
    function: {
      name: tool.name,
      description,
      parameters: tool.parameters,
      strict: TOOL_STRICT,
    },
  };
};
export const getToolDefinitions = (apiType) => {
  const useResponsesFormat = apiType === "responses";
  return validatedTools.map((tool) =>
    buildToolDefinition(tool, useResponsesFormat),
  );
};
export const parseToolArguments = (text) => {
  try {
    return parseJson(text);
  } catch (error) {
    throw new ToolInputError(error?.message || "工具参数解析失败");
  }
};
export const getToolCallArguments = (call) =>
  call?.function?.arguments ?? call?.arguments ?? "";
export const getToolCallId = (call) => {
  const callId = call?.call_id || call?.id;
  if (!callId) {
    throw new ToolInputError("工具调用缺少 call_id");
  }
  return callId;
};
export const getToolCallName = (call) => {
  const name = call?.function?.name || call?.name;
  if (!name) {
    throw new ToolInputError("工具调用缺少 name");
  }
  return name;
};
export const getToolModule = (name) => {
  const tool = toolModuleByName.get(name);
  if (!tool) {
    throw new ToolInputError(`未支持的工具：${name}`);
  }
  return tool;
};

export const getToolValidator = (name) => {
  const tool = getToolModule(name);
  if (typeof tool.validateArgs !== "function") {
    throw new ToolInputError(`工具 ${name} 缺少参数校验`);
  }
  return tool.validateArgs;
};
