const REQUEST_TYPE = "runConsoleCommand",
  RESPONSE_TYPE = "runConsoleResult";

type ConsoleRequestId = string | number;

type ConsoleSuccessPayload = {
  ok: true;
  output: string;
};

type ConsoleErrorPayload = {
  error: string;
};

type ConsoleReplyPayload = ConsoleSuccessPayload | ConsoleErrorPayload;

type IncomingConsoleMessage = {
  type: string | null;
  command: string | null;
  requestId: ConsoleRequestId | null;
};

type ConsoleCommandResult =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | ((...args: never[]) => void)
  | object
  | null
  | undefined;

type ConsoleReply = (payload: ConsoleReplyPayload) => void;

const parseIncomingConsoleMessage = (
    data: MessageEvent["data"],
  ): IncomingConsoleMessage => {
    if (typeof data !== "object" || data === null) {
      return { type: null, command: null, requestId: null };
    }
    const candidate = data as Record<string, string | number | null>,
      type = typeof candidate.type === "string" ? candidate.type : null,
      command =
        typeof candidate.command === "string" ? candidate.command : null,
      requestId =
        typeof candidate.requestId === "string" ||
        typeof candidate.requestId === "number"
          ? candidate.requestId
          : null;
    return { type, command, requestId };
  },
  hasValidRequestId = (
    requestId: ConsoleRequestId | null,
  ): requestId is ConsoleRequestId =>
    (typeof requestId === "string" && requestId.length > 0) ||
    typeof requestId === "number",
  serializeConsoleResult = (result: ConsoleCommandResult): string => {
    if (typeof result === "string") {
      return result;
    }
    if (result == null) {
      return String(result);
    }
    if (typeof result === "symbol" || typeof result === "function") {
      throw new Error("结果不可序列化");
    }
    return JSON.stringify(result);
  },
  runConsoleCommand = (
    command: string,
  ): ConsoleCommandResult | Promise<ConsoleCommandResult> =>
    window.eval(command) as
      | ConsoleCommandResult
      | Promise<ConsoleCommandResult>,
  handleRunConsoleCommand = async (command: string, reply: ConsoleReply) => {
    const normalizedCommand = command.trim();
    if (!normalizedCommand) {
      window.console.error("command 必须是非空字符串");
      reply({ error: "command 必须是非空字符串" });
      return;
    }
    try {
      const result = runConsoleCommand(normalizedCommand),
        resolvedResult = result instanceof Promise ? await result : result,
        output = serializeConsoleResult(resolvedResult);
      reply({ ok: true, output });
    } catch (error) {
      window.console.error(error);
      if (error instanceof Error) {
        reply({ error: error.message || "命令执行失败" });
        return;
      }
      reply({ error: "命令执行失败" });
    }
  },
  registerRunConsoleCommandListener = () => {
    window.addEventListener("message", (event: MessageEvent) => {
      const data = parseIncomingConsoleMessage(event.data);
      if (data.type !== REQUEST_TYPE) {
        return;
      }
      const { requestId } = data,
        reply: ConsoleReply = (payload) => {
          const message = { type: RESPONSE_TYPE, requestId, ...payload };
          if (!event.source) {
            window.console.error("消息来源缺失");
            return;
          }
          event.source.postMessage(message, "*");
        };
      if (!hasValidRequestId(requestId)) {
        window.console.error("requestId 缺失");
        reply({ error: "requestId 缺失" });
        return;
      }
      if (data.command === null) {
        window.console.error("command 必须是非空字符串");
        reply({ error: "command 必须是非空字符串" });
        return;
      }
      void handleRunConsoleCommand(data.command, reply);
    });
  };

declare global {
  interface Window {
    registerRunConsoleCommandListener: () => void;
  }
}

window.registerRunConsoleCommandListener = registerRunConsoleCommandListener;
