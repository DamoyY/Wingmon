import { t, type JsonValue } from "../../utils/index.ts";
import type { ToolExecutionContext } from "../definitions.ts";
import ToolInputError from "../errors.ts";
import { ensureObjectArgs } from "../validation/index.js";

type RunConsoleCommandArgs = {
  command: string;
};

type SandboxCommandResult = {
  ok: boolean;
  output?: string;
  error?: string;
};

const isRecord = (value: JsonValue): value is Record<string, JsonValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseSandboxCommandResult = (value: JsonValue): SandboxCommandResult => {
  if (!isRecord(value)) {
    console.error("sandbox 返回结果异常", value);
    throw new Error("命令执行失败：sandbox 返回结果异常");
  }
  if (typeof value.ok !== "boolean") {
    console.error("sandbox 返回结果缺少 ok", value);
    throw new Error("命令执行失败：sandbox 返回结果异常");
  }
  let output: string | undefined;
  if (Object.prototype.hasOwnProperty.call(value, "output")) {
    if (typeof value.output !== "string") {
      console.error("sandbox 返回结果 output 无效", value);
      throw new Error("命令执行失败：sandbox 返回结果异常");
    }
    output = value.output;
  }
  let error: string | undefined;
  if (Object.prototype.hasOwnProperty.call(value, "error")) {
    if (typeof value.error !== "string") {
      console.error("sandbox 返回结果 error 无效", value);
      throw new Error("命令执行失败：sandbox 返回结果异常");
    }
    error = value.error;
  }
  return {
    ok: value.ok,
    output,
    error,
  };
};

const parameters = {
    type: "object",
    properties: { command: { type: "string" } },
    required: ["command"],
    additionalProperties: false,
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
    const result = parseSandboxCommandResult(
      await context.sendMessageToSandbox({ command }),
    );
    if (!result.ok) {
      throw new Error(result.error || "命令执行失败");
    }
    if (typeof result.output !== "string") {
      console.error("sandbox 返回结果缺少 output", result);
      throw new Error("命令执行失败：sandbox 返回结果异常");
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
