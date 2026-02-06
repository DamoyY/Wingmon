import type { JsonValue } from "../../utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import clickButton from "./clickButton.ts";
import closeBrowserPage from "./closeBrowserPage.ts";
import enterText from "./enterText.ts";
import getPageMarkdown from "./getPageMarkdown.ts";
import listTabs from "./listTabs.ts";
import openBrowserPage from "./openBrowserPage.ts";
import runConsoleCommand from "./runConsoleCommand.ts";
import showHtml from "./showHtml.ts";

type ToolParameterSchema = Record<string, JsonValue>;

type ToolModuleEntry = {
  key?: string;
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (
    args: JsonValue,
    context: ToolExecutionContext,
  ) => JsonValue | Promise<JsonValue>;
  validateArgs: (args: JsonValue) => JsonValue;
  formatResult?: (result: JsonValue) => string;
  buildMessageContext?: (
    args: JsonValue,
    result: JsonValue,
  ) => JsonValue | null;
  pageReadDedupeAction?: "removeToolCall" | "trimToolResponse";
};

const toolModules: ToolModuleEntry[] = [
  clickButton,
  closeBrowserPage,
  enterText,
  getPageMarkdown,
  listTabs,
  openBrowserPage,
  runConsoleCommand,
  showHtml,
];

export default toolModules;
