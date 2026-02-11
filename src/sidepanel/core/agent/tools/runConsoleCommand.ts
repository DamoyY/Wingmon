import { type JsonValue, t } from "../../../lib/utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/index.js";

type RunConsoleCommandArgs = {
  command: string;
};

const parameters = {
    additionalProperties: false,
    properties: { command: { type: "string" } },
    required: ["command"],
    type: "object",
  },
  validateArgs = (args: JsonValue): RunConsoleCommandArgs => {
    const record = ensureObjectArgs(args);
    if (typeof record.command !== "string" || !record.command.trim()) {
      throw new ToolInputError("command 必须是非空字符串");
    }
    return { command: record.command.trim() };
  },
  execute = async (
    { command }: RunConsoleCommandArgs,
    context: ToolExecutionContext,
  ): Promise<string> => {
    const result = await context.sendMessageToSandbox({ command });
    if (!result.ok) {
      throw new Error(result.error);
    }
    return result.output;
  };

export default {
  description: t("toolRunConsole"),
  execute,
  key: "runConsoleCommand",
  name: "run_console",
  parameters,
  validateArgs,
};
