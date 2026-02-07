import registerMessageListener from "./messaging/listener.ts";

const reportReady = async (): Promise<void> => {
    await chrome.runtime.sendMessage({ type: "contentScriptReady" });
  },
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
