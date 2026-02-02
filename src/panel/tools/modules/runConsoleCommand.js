import { t } from "../../utils/index.js";
import { sendMessageToSandbox } from "../../services/index.js";
import ToolInputError from "../errors.js";
import { ensureObjectArgs } from "./utils.js";

const parameters = {
  type: "object",
  properties: { command: { type: "string" } },
  required: ["command"],
  additionalProperties: false,
};

const validateArgs = (args) => {
  ensureObjectArgs(args);
  if (typeof args.command !== "string" || !args.command.trim()) {
    throw new ToolInputError("command 必须是非空字符串");
  }
  return { command: args.command.trim() };
};

const execute = async ({ command }) => {
  const result = await sendMessageToSandbox({ command });
  if (!result?.ok) {
    throw new Error(result?.error || "命令执行失败");
  }
  return result.output;
};

export default {
  key: "runConsoleCommand",
  name: "run_console",
  description: t("toolRunConsole"),
  parameters,
  validateArgs,
  execute,
};
