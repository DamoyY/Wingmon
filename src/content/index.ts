import registerMessageListener from "./messaging/listener.ts";

type ContentRuntime = {
  sendMessage: (message: { type: string }, callback: () => void) => void;
  lastError?: { message?: string } | null;
};

const runtime = chrome.runtime as ContentRuntime;

const reportReady = (): Promise<void> =>
    new Promise((resolve, reject) => {
      runtime.sendMessage({ type: "contentScriptReady" }, () => {
        const errorMessage = runtime.lastError?.message;
        if (typeof errorMessage === "string" && errorMessage) {
          reject(new Error(errorMessage));
          return;
        }
        resolve();
      });
    }),
  loadListener = async (): Promise<void> => {
    if (typeof registerMessageListener !== "function") {
      throw new Error("内容脚本缺少消息监听注册函数");
    }
    registerMessageListener();
    await reportReady();
  },
  bootstrap = async (): Promise<void> => {
    try {
      await loadListener();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "内容脚本初始化失败";
      console.error(message);
      throw new Error(message);
    }
  };

void bootstrap();
