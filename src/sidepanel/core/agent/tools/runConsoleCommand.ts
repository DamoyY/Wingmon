import type { ToolExecutionContext } from "../definitions.ts";
import { t } from "../../../lib/utils/index.ts";

type RunConsoleCommandArgs = {
  command: string;
};

const parameters = {
    additionalProperties: false,
    properties: { command: { minLength: 1, pattern: "\\S", type: "string" } },
    required: ["command"],
    type: "object",
  },
  execute = async (
    { command }: RunConsoleCommandArgs,
    context: ToolExecutionContext,
  ): Promise<string> => {
    const result = await context.sendMessageToSandbox({
      command: command.trim(),
    });
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
};
