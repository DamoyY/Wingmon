chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "getPageContent") {
    return;
  }
  const html = document.body ? document.body.innerHTML : "";
  sendResponse({ html, title: document.title || "", url: location.href || "" });
});
