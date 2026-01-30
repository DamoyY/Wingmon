import {
  applyTheme as applyMaterialTheme,
  argbFromHex,
  themeFromSourceColor,
} from "@material/material-color-utilities";
import {
  DEFAULT_THEME_COLOR,
  normalizeTheme,
  normalizeThemeColor,
} from "../utils/index.js";

let currentThemeColor = DEFAULT_THEME_COLOR;
const applyMaterialTokens = (dark) => {
  const seedColor = argbFromHex(currentThemeColor);
  const materialTheme = themeFromSourceColor(seedColor);
  applyMaterialTheme(materialTheme, {
    target: document.documentElement,
    dark,
  });
};

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
    const isDark = media.matches;
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
    applyMaterialTokens(isDark);
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
const applyTheme = (theme, themeColor = currentThemeColor) => {
  const normalized = normalizeTheme(theme);
  currentThemeColor = normalizeThemeColor(themeColor);
  stopAutoThemeSync();
  if (normalized === "auto") {
    startAutoThemeSync();
    return normalized;
  }
  document.documentElement.setAttribute("data-theme", normalized);
  applyMaterialTokens(normalized === "dark");
  return normalized;
};
export default applyTheme;
