if (typeof window.registerRunConsoleCommandListener === "function") {
  window.registerRunConsoleCommandListener();
} else {
  window.console.error("registerRunConsoleCommandListener 未定义");
}

if (typeof window.registerRenderHtmlListener === "function") {
  window.registerRenderHtmlListener();
} else {
  window.console.error("registerRenderHtmlListener 未定义");
}
