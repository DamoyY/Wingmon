const reportReady = () =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "contentScriptReady" }, () => {
      if (chrome.runtime.lastError) {
        const message =
          chrome.runtime.lastError.message || "内容脚本就绪通知失败";
        reject(new Error(message));
        return;
      }
      resolve();
    });
  });
const loadListener = async () => {
  const url = chrome.runtime.getURL("src/content/messaging/listener.js");
  const module = await import(url);
  if (!module?.default) {
    throw new Error("内容脚本缺少消息监听注册函数");
  }
  module.default();
  await reportReady();
};
loadListener().catch((error) => {
  const message = error?.message || "内容脚本初始化失败";
  throw new Error(message);
});
