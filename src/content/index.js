const loadListener = async () => {
  const url = chrome.runtime.getURL("src/content/messaging/listener.js");
  const module = await import(url);
  if (!module?.registerMessageListener) {
    throw new Error("内容脚本缺少消息监听注册函数");
  }
  module.registerMessageListener();
};
loadListener().catch((error) => {
  const message = error?.message || "内容脚本初始化失败";
  throw new Error(message);
});
