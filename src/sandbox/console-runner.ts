const REQUEST_TYPE = "runConsoleCommand",
  RESPONSE_TYPE = "runConsoleResult";

type ConsoleSuccessPayload = {
  ok: true;
  output: string;
};

type ConsoleErrorPayload = {
  error: string;
  ok: false;
};

type ConsoleCommandReplyPayload = ConsoleSuccessPayload | ConsoleErrorPayload;

type ConsoleResponsePayload =
  | (ConsoleSuccessPayload & {
      requestId: string;
      type: typeof RESPONSE_TYPE;
    })
  | (ConsoleErrorPayload & {
      requestId: string;
      type: typeof RESPONSE_TYPE;
    });

type IncomingConsoleMessage = {
  command: string;
  requestId: string;
  type: typeof REQUEST_TYPE;
};

type ConsoleCommandReply = (payload: ConsoleCommandReplyPayload) => void;
type ConsoleResponseReply = (payload: ConsoleResponsePayload) => void;

const requestKeys = new Set(["command", "requestId", "type"]);

const isRuntimeObject = (
    value: MessageEvent["data"],
  ): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  hasOnlyKeys = (
    value: Record<string, unknown>,
    allowedKeys: ReadonlySet<string>,
  ): boolean => Object.keys(value).every((key) => allowedKeys.has(key)),
  isIncomingConsoleMessage = (
    data: MessageEvent["data"],
  ): data is IncomingConsoleMessage => {
    if (!isRuntimeObject(data) || !hasOnlyKeys(data, requestKeys)) {
      return false;
    }
    return (
      data.type === REQUEST_TYPE &&
      typeof data.command === "string" &&
      typeof data.requestId === "string" &&
      data.requestId.trim().length > 0
    );
  },
  isWindowSource = (
    source: MessageEventSource | null,
  ): source is WindowProxy => {
    return source !== null && "location" in source;
  },
  serializeConsoleResult = (result: unknown): string => {
    if (typeof result === "string") {
      return result;
    }
    if (result === undefined) {
      return "undefined";
    }
    if (result === null) {
      return String(result);
    }
    if (typeof result === "symbol" || typeof result === "function") {
      throw new Error("结果不可序列化");
    }
    const serialized = JSON.stringify(result);
    if (typeof serialized !== "string") {
      throw new Error("结果不可序列化");
    }
    return serialized;
  },
  runConsoleCommand = (command: string): unknown => window.eval(command),
  handleRunConsoleCommand = async (
    command: string,
    reply: ConsoleCommandReply,
  ) => {
    const normalizedCommand = command.trim();
    if (!normalizedCommand) {
      window.console.error("command 必须是非空字符串");
      reply({ error: "command 必须是非空字符串", ok: false });
      return;
    }
    try {
      const resolvedResult = await Promise.resolve(
          runConsoleCommand(normalizedCommand),
        ),
        output = serializeConsoleResult(resolvedResult);
      reply({ ok: true, output });
    } catch (error) {
      window.console.error(error);
      if (error instanceof Error) {
        reply({ error: error.message || "命令执行失败", ok: false });
        return;
      }
      reply({ error: "命令执行失败", ok: false });
    }
  },
  registerRunConsoleCommandListener = () => {
    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (!isIncomingConsoleMessage(event.data)) {
        return;
      }
      const { requestId } = event.data,
        reply: ConsoleResponseReply = (payload) => {
          if (!isWindowSource(event.source)) {
            window.console.error("消息来源缺失");
            return;
          }
          event.source.postMessage(payload, "*");
        };
      const normalizedCommand = event.data.command.trim();
      if (!normalizedCommand) {
        window.console.error("command 必须是非空字符串");
        reply({
          error: "command 必须是非空字符串",
          ok: false,
          requestId,
          type: RESPONSE_TYPE,
        });
        return;
      }
      void handleRunConsoleCommand(normalizedCommand, (payload) => {
        if (payload.ok) {
          reply({
            ok: true,
            output: payload.output,
            requestId,
            type: RESPONSE_TYPE,
          });
          return;
        }
        reply({
          error: payload.error,
          ok: false,
          requestId,
          type: RESPONSE_TYPE,
        });
      });
    });
  };

declare global {
  interface Window {
    registerRunConsoleCommandListener: () => void;
  }
}

window.registerRunConsoleCommandListener = registerRunConsoleCommandListener;
