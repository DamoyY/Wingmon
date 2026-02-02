import { setStateValue, state } from "../state/index.js";
import { getActiveTab } from "./tabs.js";

const loadSystemPrompt = async () => {
    if (state.systemPrompt !== null) {
      return state.systemPrompt;
    }
    const response = await fetch(
      chrome.runtime.getURL("public/system_prompt.md"),
    );
    if (!response.ok) {
      throw new Error(`系统提示加载失败：${response.status}`);
    }
    const content = (await response.text()) || "";
    setStateValue("systemPrompt", content);
    return content;
  },
  formatTime = (date) => {
    if (!(date instanceof Date)) {
      throw new Error("时间格式化失败：无效的日期对象");
    }
    if (Number.isNaN(date.getTime())) {
      throw new Error("时间格式化失败：日期无效");
    }
    return date.toLocaleString(chrome.i18n.getUILanguage(), {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
  },
  resolveUserAgent = () => {
    const ua = navigator?.userAgent;
    if (typeof ua !== "string" || !ua.trim()) {
      throw new Error("无法获取 User Agent");
    }
    return ua;
  },
  resolveFocusTabId = async () => {
    const activeTab = await getActiveTab();
    if (!activeTab || typeof activeTab.id !== "number") {
      throw new Error("无法获取当前标签页 TabID");
    }
    return String(activeTab.id);
  },
  applyDynamicTags = async (template) => {
    let output = template;
    if (output.includes("{time}")) {
      output = output.replaceAll("{time}", formatTime(new Date()));
    }
    if (output.includes("{user-agent}")) {
      output = output.replaceAll("{user-agent}", resolveUserAgent());
    }
    if (output.includes("{focus-tabid}")) {
      const tabId = await resolveFocusTabId();
      output = output.replaceAll("{focus-tabid}", tabId);
    }
    return output;
  },
  buildSystemPrompt = async () => {
    const raw = await loadSystemPrompt();
    if (!raw) {
      return "";
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return "";
    }
    return applyDynamicTags(trimmed);
  };

export default buildSystemPrompt;
