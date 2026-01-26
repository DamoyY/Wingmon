import { normalizeTheme } from "../utils/theme.js";
let autoThemeMedia = null;
let autoThemeListener = null;
const stopAutoThemeSync = () => {
  if (!autoThemeMedia || !autoThemeListener) {
    autoThemeMedia = null;
    autoThemeListener = null;
    return;
  }
  if (typeof autoThemeMedia.removeEventListener === "function") {
    autoThemeMedia.removeEventListener("change", autoThemeListener);
  } else if (typeof autoThemeMedia.removeListener === "function") {
    autoThemeMedia.removeListener(autoThemeListener);
  } else {
    throw new Error("无法移除系统主题监听");
  }
  autoThemeMedia = null;
  autoThemeListener = null;
};
const startAutoThemeSync = () => {
  if (typeof window.matchMedia !== "function") {
    throw new Error("matchMedia 不可用，无法应用自动主题");
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const applySystemTheme = () => {
    document.documentElement.setAttribute(
      "data-theme",
      media.matches ? "dark" : "light",
    );
  };
  applySystemTheme();
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", applySystemTheme);
  } else if (typeof media.addListener === "function") {
    media.addListener(applySystemTheme);
  } else {
    throw new Error("无法监听系统主题变化");
  }
  autoThemeMedia = media;
  autoThemeListener = applySystemTheme;
};
export const applyTheme = (theme) => {
  const normalized = normalizeTheme(theme);
  stopAutoThemeSync();
  if (normalized === "auto") {
    startAutoThemeSync();
    return normalized;
  }
  document.documentElement.setAttribute("data-theme", normalized);
  return normalized;
};
