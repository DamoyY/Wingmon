import "./console-runner.ts";
import "./html-renderer.ts";

type SandboxWindow = Window & {
  registerRunConsoleCommandListener?: () => void;
  registerRenderHtmlListener?: () => void;
};

const sandboxWindow = window as SandboxWindow;

if (typeof sandboxWindow.registerRunConsoleCommandListener === "function") {
  sandboxWindow.registerRunConsoleCommandListener();
} else {
  window.console.error("registerRunConsoleCommandListener 未定义");
}

if (typeof sandboxWindow.registerRenderHtmlListener === "function") {
  sandboxWindow.registerRenderHtmlListener();
} else {
  window.console.error("registerRenderHtmlListener 未定义");
}
