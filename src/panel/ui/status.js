const reportStatus = (text) => {
  if (typeof text !== "string") {
    throw new Error("状态文本必须为字符串");
  }
  if (!text.trim()) {
    return;
  }
  const consoleRef = globalThis?.console;
  if (!consoleRef || typeof consoleRef.info !== "function") {
    throw new Error("控制台不可用");
  }
  consoleRef.info(`[Wingmon] ${text}`);
};

export default reportStatus;
