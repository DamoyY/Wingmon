const REQUEST_TYPE = "runConsoleCommand",
  RESPONSE_TYPE = "runConsoleResult";

type ConsoleReplyPayload = { ok?: boolean; output?: string; error?: string };

type RunConsoleMessage = {
  type?: string;
  command?: string;
  requestId?: string | number;
};

type ConsoleReply = (payload: ConsoleReplyPayload) => void;

const serializeConsoleResult = (result: unknown): string => {
    if (typeof result === "string") {
      return result;
    }
    if (typeof result === "undefined") {
      return "undefined";
    }
    if (result === null) {
      return "null";
    }
    const serialized = JSON.stringify(result);
    if (typeof serialized !== "string") {
      throw new Error("结果不可序列化");
    }
    return serialized;
  },
  runConsoleCommand = (command: string) => window.eval(command),
  handleRunConsoleCommand = async (
    message: RunConsoleMessage,
    reply: ConsoleReply,
  ) => {
    const command =
      typeof message?.command === "string" ? message.command.trim() : "";
    if (!command) {
      window.console.error("command 必须是非空字符串");
      reply({ error: "command 必须是非空字符串" });
      return;
    }
    try {
      let result = runConsoleCommand(command);
      if (result instanceof Promise) {
        result = await result;
      }
      const output = serializeConsoleResult(result);
      reply({ ok: true, output });
    } catch (error) {
      window.console.error(error);
      const messageText = error instanceof Error ? error.message : undefined;
      reply({ error: messageText || "命令执行失败" });
    }
  },
  registerRunConsoleCommandListener = () => {
    window.addEventListener("message", (event: MessageEvent) => {
      const data = (event.data ?? {}) as RunConsoleMessage;
      if (data.type !== REQUEST_TYPE) {
        return;
      }
      const { requestId } = data,
        reply: ConsoleReply = (payload) => {
          const message = { type: RESPONSE_TYPE, requestId, ...payload };
          event.source?.postMessage(message, "*");
        };
      if (!requestId) {
        window.console.error("requestId 缺失");
        reply({ error: "requestId 缺失" });
        return;
      }
      handleRunConsoleCommand(data, reply);
    });
  };

declare global {
  interface Window {
    registerRunConsoleCommandListener?: () => void;
  }
}

window.registerRunConsoleCommandListener = registerRunConsoleCommandListener;
