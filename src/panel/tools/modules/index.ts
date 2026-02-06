import type { JsonValue } from "../../utils/index.ts";
import clickButton from "./clickButton.ts";
import closeBrowserPage from "./closeBrowserPage.ts";
import enterText from "./enterText.ts";
import getPageMarkdown from "./getPageMarkdown.ts";
import listTabs from "./listTabs.js";
import openBrowserPage from "./openBrowserPage.ts";
import runConsoleCommand from "./runConsoleCommand.js";
import showHtml from "./showHtml.js";

type ToolParameterSchema = Record<string, JsonValue>;

type ToolModuleEntry = {
  key?: string;
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (args: JsonValue) => JsonValue | Promise<JsonValue>;
  validateArgs: (args: JsonValue) => JsonValue;
};

const listTabsModule = listTabs as ToolModuleEntry;
const runConsoleCommandModule = runConsoleCommand as ToolModuleEntry;
const showHtmlModule = showHtml as ToolModuleEntry;

const toolModules: ToolModuleEntry[] = [
  clickButton,
  closeBrowserPage,
  enterText,
  getPageMarkdown,
  listTabsModule,
  openBrowserPage,
  runConsoleCommandModule,
  showHtmlModule,
];

export default toolModules;
