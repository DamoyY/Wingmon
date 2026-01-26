const VIEWPORT_MARKER_ATTR = "data-llm-viewport-center";

const assignLlmIds = (root) => {
  const buttons = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"]',
  );
  const buttonCount = buttons.length;
  const idBase = 36;
  const minIdLength = 4;
  const idLength =
    buttonCount <= 1 ? minIdLength : (
      Math.max(minIdLength, Math.ceil(Math.log(buttonCount) / Math.log(idBase)))
    );
  const usedIds = new Set();
  buttons.forEach((button, index) => {
    const id = index.toString(idBase).padStart(idLength, "0");
    if (usedIds.has(id)) {
      throw new Error(`生成按钮 ID 重复: ${id}`);
    }
    usedIds.add(id);
    button.setAttribute("data-llm-id", id);
  });
};

const insertViewportMarker = (root) => {
  if (!root) {
    throw new Error("页面没有可用的 body");
  }
  const centerX = Math.max(0, Math.floor(window.innerWidth / 2));
  const centerY = Math.max(0, Math.floor(window.innerHeight / 2));
  const centerElement = document.elementFromPoint(centerX, centerY);
  const marker = document.createElement("span");
  marker.setAttribute(VIEWPORT_MARKER_ATTR, "true");
  marker.textContent = "";
  if (!centerElement) {
    root.appendChild(marker);
    return marker;
  }
  let insertionTarget = centerElement;
  let parentNode = centerElement.parentNode;
  if (typeof centerElement.getRootNode === "function") {
    const rootNode = centerElement.getRootNode();
    if (rootNode && rootNode instanceof ShadowRoot && rootNode.host) {
      insertionTarget = rootNode.host;
      parentNode = insertionTarget.parentNode;
    }
  }
  if (!parentNode) {
    root.appendChild(marker);
    return marker;
  }
  if (
    insertionTarget === document.documentElement ||
    insertionTarget === root
  ) {
    root.appendChild(marker);
    return marker;
  }
  parentNode.insertBefore(marker, insertionTarget);
  return marker;
};

const handleGetPageContent = (sendResponse) => {
  if (!document.body) {
    sendResponse({ error: "页面没有可用的 body" });
    return;
  }
  let marker = null;
  try {
    marker = insertViewportMarker(document.body);
    assignLlmIds(document.body);
    const html = document.body.innerHTML;
    sendResponse({
      html,
      title: document.title || "",
      url: location.href || "",
    });
  } finally {
    if (marker && marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }
};

const handleclickBotton = (message, sendResponse) => {
  const id = typeof message?.id === "string" ? message.id.trim() : "";
  if (!id) {
    sendResponse({ error: "id 必须是非空字符串" });
    return;
  }
  if (!/^[0-9a-z]+$/i.test(id)) {
    sendResponse({ error: "id 仅支持字母数字" });
    return;
  }
  const normalizedId = id.toLowerCase();
  const matches = document.querySelectorAll(`[data-llm-id="${normalizedId}"]`);
  if (!matches.length) {
    sendResponse({ error: `未找到 id 为 ${normalizedId} 的按钮` });
    return;
  }
  if (matches.length > 1) {
    sendResponse({ error: `找到多个 id 为 ${normalizedId} 的按钮` });
    return;
  }
  matches[0].click();
  sendResponse({ ok: true });
};

const serializeConsoleResult = (result) => {
  if (typeof result === "string") return result;
  if (typeof result === "undefined") return "undefined";
  if (result === null) return "null";
  const serialized = JSON.stringify(result);
  if (typeof serialized !== "string") {
    throw new Error("结果不可序列化");
  }
  return serialized;
};
const handleRunConsoleCommand = async (message, sendResponse) => {
  const command =
    typeof message?.command === "string" ? message.command.trim() : "";
  if (!command) {
    sendResponse({ error: "command 必须是非空字符串" });
    return;
  }
  let result;
  try {
    result = eval(command);
    if (result instanceof Promise) {
      result = await result;
    }
    const output = serializeConsoleResult(result);
    sendResponse({ ok: true, output });
  } catch (error) {
    sendResponse({ error: error?.message || "命令执行失败" });
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message?.type === "ping") {
      if (!document.body) {
        sendResponse({ error: "页面没有可用的 body" });
        return;
      }
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "getPageContent") {
      handleGetPageContent(sendResponse);
      return;
    }
    if (message?.type === "clickBotton") {
      handleclickBotton(message, sendResponse);
      return;
    }
    if (message?.type === "runConsoleCommand") {
      handleRunConsoleCommand(message, sendResponse);
      return true;
    }
  } catch (error) {
    sendResponse({ error: error?.message || "未知错误" });
  }
});
