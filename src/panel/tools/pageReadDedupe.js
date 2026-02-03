import { t } from "../utils/index.ts";
import {
  getToolCallArguments,
  getToolCallId,
  getToolCallName,
  getToolValidator,
  parseToolArguments,
  toolNames,
} from "./definitions.js";

const extractGetPageTabIdFromCall = (call) => {
    const argsText = getToolCallArguments(call);
    let args;
    try {
      args = parseToolArguments(argsText || "{}");
    } catch (error) {
      const message = error?.message || "未知错误";
      throw new Error(`get_page 工具参数解析失败：${message}`);
    }
    const { tabId } = getToolValidator(toolNames.getPageMarkdown)(args);
    return tabId;
  },
  extractPageReadTabIdFromOutput = (content, successLabel, toolName) => {
    if (typeof content !== "string") {
      throw new Error(`${toolName} 工具响应必须是字符串`);
    }
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error(`${toolName} 工具响应不能为空`);
    }
    if (!trimmed.startsWith(successLabel)) {
      return null;
    }
    if (trimmed === successLabel) {
      return null;
    }
    const match = trimmed.match(/TabID:\s*["'“”]?(\d+)["'“”]?/);
    if (!match) {
      throw new Error(`${toolName} 成功响应缺少 TabID`);
    }
    const tabId = Number(match[1]);
    if (!Number.isInteger(tabId) || tabId <= 0) {
      throw new Error(`${toolName} 响应 TabID 无效`);
    }
    return tabId;
  },
  extractOpenPageTabIdFromOutput = (content) =>
    extractPageReadTabIdFromOutput(
      content,
      t("statusOpenSuccess"),
      toolNames.openBrowserPage,
    ),
  extractClickButtonTabIdFromMessage = (message) => {
    const storedTabId = message?.pageReadTabId;
    if (Number.isInteger(storedTabId) && storedTabId > 0) {
      return storedTabId;
    }
    const tabId = extractPageReadTabIdFromOutput(
      message?.content,
      t("statusClickSuccess"),
      toolNames.clickButton,
    );
    if (!tabId) {
      return null;
    }
    return tabId;
  },
  isGetPageSuccessOutput = (content) =>
    typeof content === "string" &&
    content.trim().startsWith(t("statusTitleLabel"));

export const collectPageReadDedupeSets = (messages) => {
  const callInfoById = new Map();
  messages.forEach((msg) => {
    if (!Array.isArray(msg.tool_calls)) {
      return;
    }
    msg.tool_calls.forEach((call) => {
      const callId = getToolCallId(call),
        name = getToolCallName(call);
      if (callInfoById.has(callId)) {
        const existing = callInfoById.get(callId);
        if (existing?.name !== name) {
          throw new Error(`重复的工具调用 ID：${callId}`);
        }
        return;
      }
      const info = { name };
      if (name === toolNames.getPageMarkdown) {
        info.tabId = extractGetPageTabIdFromCall(call);
      }
      callInfoById.set(callId, info);
    });
  });
  const readEvents = [];
  messages.forEach((msg, index) => {
    if (msg.role !== "tool") {
      return;
    }
    const callId = msg.tool_call_id;
    if (!callId) {
      throw new Error("工具响应缺少 tool_call_id");
    }
    const info = callInfoById.get(callId),
      name = msg.name || info?.name;
    if (!name) {
      throw new Error(`工具响应缺少 name：${callId}`);
    }
    if (name === toolNames.getPageMarkdown) {
      if (!isGetPageSuccessOutput(msg.content)) {
        return;
      }
      const tabId = info?.tabId;
      if (!tabId) {
        throw new Error(`get_page 工具响应缺少 tabId：${callId}`);
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
      });
      return;
    }
    if (name === toolNames.openBrowserPage) {
      const tabId = extractOpenPageTabIdFromOutput(msg.content);
      if (!tabId) {
        return;
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
      });
      return;
    }
    if (name === toolNames.clickButton) {
      const tabId = extractClickButtonTabIdFromMessage(msg);
      if (!tabId) {
        return;
      }
      readEvents.push({
        tabId,
        type: name,
        callId,
        index,
      });
    }
  });
  const latestByTabId = new Map();
  readEvents.forEach((event) => {
    const existing = latestByTabId.get(event.tabId);
    if (!existing || event.index > existing.index) {
      latestByTabId.set(event.tabId, event);
    }
  });
  const removeToolCallIds = new Set(),
    trimToolResponseIds = new Set();
  readEvents.forEach((event) => {
    const latest = latestByTabId.get(event.tabId);
    if (!latest || latest.callId === event.callId) {
      return;
    }
    if (event.type === toolNames.getPageMarkdown) {
      removeToolCallIds.add(event.callId);
      return;
    }
    if (
      event.type === toolNames.openBrowserPage ||
      event.type === toolNames.clickButton
    ) {
      trimToolResponseIds.add(event.callId);
    }
  });
  return { removeToolCallIds, trimToolResponseIds };
};

export const getToolOutputContent = (msg, trimToolResponseIds) =>
  trimToolResponseIds.has(msg.tool_call_id)
    ? `**${t("statusSuccess")}**`
    : msg.content;
