import { createRandomId } from "../../shared/index.ts";

const answerNotificationIconPath = "0.128.png";

const createAnswerNotification = async (
  title: string,
  message: string,
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    chrome.notifications.create(
      createRandomId("notify"),
      {
        iconUrl: chrome.runtime.getURL(answerNotificationIconPath),
        message,
        title,
        type: "basic",
      },
      () => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve();
      },
    );
  });

export const notifyAssistantReplyWhenSidePanelClosed = async (
  replyContent: string,
  isSidePanelClosed: () => boolean,
): Promise<void> => {
  if (!isSidePanelClosed()) {
    return;
  }
  const title = chrome.i18n.getMessage("extensionName").trim() || "Wingmon";
  try {
    await createAnswerNotification(title, replyContent);
  } catch (error) {
    console.error("发送回答完成通知失败", error);
  }
};
