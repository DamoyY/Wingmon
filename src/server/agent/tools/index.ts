import type {
  ToolExecutionContext,
  ToolMessageContext,
  ToolPageReadDedupeAction,
} from "../definitions.ts";
import type { JsonValue } from "../../../shared/index.ts";
import type { ToolJsonSchema } from "../validation/index.js";
import type { ToolNameKey } from "../toolConstants.ts";
import clickButton from "./clickButtonTool.ts";
import closeBrowserPage from "./closeBrowserPage.ts";
import enterText from "./enterTextTool.ts";
import find from "./find.ts";
import getPageMarkdown from "./getPageMarkdown.ts";
import listTabs from "./listTabs.ts";
import openBrowserPage from "./openBrowserPage.ts";
import runConsoleCommand from "./runConsoleCommand.ts";
import showHtml from "./showHtml.ts";
import wait from "./wait.ts";

type ToolParameterSchema = ToolJsonSchema;

export type ToolModuleEntry = {
  key?: ToolNameKey;
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (
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

const toolModules: ToolModuleEntry[] = [
  openBrowserPage,
  getPageMarkdown,
  closeBrowserPage,
  listTabs,
  clickButton,
  enterText,
  find,
  runConsoleCommand,
  showHtml,
  wait,
];

export default toolModules;
