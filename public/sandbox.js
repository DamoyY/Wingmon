const RESPONSE_TYPE = "runConsoleResult";
const REQUEST_TYPE = "runConsoleCommand";
const serializeConsoleResult = (result) => {
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
};
const runConsoleCommand = (command) => eval(command);
const handleRunConsoleCommand = async (message, reply) => {
  const command =
    typeof message?.command === "string" ? message.command.trim() : "";
  if (!command) {
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
    reply({ error: error?.message || "命令执行失败" });
  }
};
window.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== REQUEST_TYPE) {
    return;
  }
  const { requestId } = data;
  const reply = (payload) => {
    const message = { type: RESPONSE_TYPE, requestId, ...payload };
    event.source?.postMessage(message, "*");
  };
  if (!requestId) {
    reply({ error: "requestId 缺失" });
    return;
  }
  handleRunConsoleCommand(data, reply);
});
const handleRenderHtml = (message) => {
  const html = message.html;
  if (typeof html !== "string") return;
  document.open();
  document.write(html);
  document.close();
};
window.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "renderHtml") {
    handleRenderHtml(data);
  }
});