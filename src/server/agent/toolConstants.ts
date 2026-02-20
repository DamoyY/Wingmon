import {
  AGENT_STATUS,
  type AgentStatus,
} from "../../shared/contracts/index.ts";

export const toolNames = {
  clickButton: "click_button",
  closeBrowserPage: "close_tab",
  enterText: "enter_text",
  find: "find",
  getPageMarkdown: "get_page",
  listTabs: "list_tabs",
  openBrowserPage: "open_page",
  runConsoleCommand: "run_console",
  showHtml: "show_html",
} as const;

export type ToolNameKey = keyof typeof toolNames;

export type ToolName = (typeof toolNames)[ToolNameKey];

export const toolNameKeys = [
  "clickButton",
  "closeBrowserPage",
  "enterText",
  "find",
  "getPageMarkdown",
  "listTabs",
  "openBrowserPage",
  "runConsoleCommand",
  "showHtml",
] as const satisfies readonly ToolNameKey[];

export const waitToolName = "wait";

export const toolStatusMap: Readonly<Partial<Record<string, AgentStatus>>> = {
  [toolNames.clickButton]: AGENT_STATUS.operating,
  [toolNames.closeBrowserPage]: AGENT_STATUS.operating,
  [toolNames.enterText]: AGENT_STATUS.operating,
  [toolNames.find]: AGENT_STATUS.searching,
  [toolNames.getPageMarkdown]: AGENT_STATUS.browsing,
  [toolNames.listTabs]: AGENT_STATUS.browsing,
  [toolNames.openBrowserPage]: AGENT_STATUS.browsing,
  [toolNames.runConsoleCommand]: AGENT_STATUS.coding,
  [toolNames.showHtml]: AGENT_STATUS.coding,
  [waitToolName]: AGENT_STATUS.thinking,
};
