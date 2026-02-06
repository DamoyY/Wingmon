import { setStateValue, state } from "../state/index.ts";
import { systemPromptContent } from "./systemPromptContent.ts";
import { getActiveTab } from "./tabs.ts";

type ChromeI18n = {
  getUILanguage: () => string;
};

type ChromeApi = {
  i18n: ChromeI18n;
};

declare const chrome: ChromeApi;

const loadSystemPrompt = (): string => {
    if (state.systemPrompt !== null) {
      return state.systemPrompt;
    }
    const content = systemPromptContent || "";
    setStateValue("systemPrompt", content);
    return content;
  },
  formatTime = (date: Date): string => {
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
  resolveUserAgent = (): string => {
    const ua = navigator.userAgent;
    if (typeof ua !== "string" || !ua.trim()) {
      throw new Error("无法获取 User Agent");
    }
    return ua;
  },
  resolveFocusTabId = async (): Promise<string> => {
    const activeTab = await getActiveTab();
    if (typeof activeTab.id !== "number") {
      throw new Error("无法获取当前标签页 TabID");
    }
    return String(activeTab.id);
  },
  applyDynamicTags = async (template: string): Promise<string> => {
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
  buildSystemPrompt = async (): Promise<string> => {
    const raw = loadSystemPrompt();
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
