const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const OFFSCREEN_REASON: chrome.offscreen.Reason = "IFRAME_SCRIPTING";
const OFFSCREEN_JUSTIFICATION =
  "Host sandbox iframe and keep service worker alive";

let creatingDocumentPromise: Promise<void> | null = null;

const hasOffscreenDocument = async (): Promise<boolean> => {
  if (
    typeof chrome.offscreen === "undefined" ||
    typeof chrome.offscreen.hasDocument !== "function"
  ) {
    return false;
  }
  try {
    return await chrome.offscreen.hasDocument();
  } catch (error) {
    console.error("检测 offscreen 文档状态失败", error);
    return false;
  }
};

const isDuplicateDocumentError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("Only a single offscreen document");
};

export const ensureOffscreenDocument = async (): Promise<void> => {
  if (typeof chrome.offscreen === "undefined") {
    throw new Error("当前环境不支持 offscreen API");
  }
  if (await hasOffscreenDocument()) {
    return;
  }
  if (creatingDocumentPromise !== null) {
    return creatingDocumentPromise;
  }
  creatingDocumentPromise = chrome.offscreen
    .createDocument({
      justification: OFFSCREEN_JUSTIFICATION,
      reasons: [OFFSCREEN_REASON],
      url: OFFSCREEN_DOCUMENT_PATH,
    })
    .catch((error: unknown) => {
      if (isDuplicateDocumentError(error)) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "创建 offscreen 文档失败";
      console.error(message, error);
      throw error;
    })
    .finally(() => {
      creatingDocumentPromise = null;
    });
  await creatingDocumentPromise;
};
