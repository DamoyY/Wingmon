import {
  argbFromHex,
  DynamicScheme,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  Variant,
} from "@material/material-color-utilities";
import {
  DEFAULT_THEME_COLOR,
  normalizeTheme,
  normalizeThemeColor,
} from "../../utils/index.js";

let currentThemeColor = DEFAULT_THEME_COLOR;
let hasAppliedTheme = false;
const THEME_TRANSITION_CLASS = "theme-transition";
const THEME_TRANSITION_DURATION = 240;
let themeTransitionTimer = null;
const shouldReduceMotion = () => {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
const runThemeTransition = (apply) => {
  if (typeof apply !== "function") {
    throw new Error("主题应用器必须是函数");
  }
  if (!hasAppliedTheme || shouldReduceMotion()) {
    apply();
    hasAppliedTheme = true;
    return;
  }
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(() => {
      apply();
    });
    hasAppliedTheme = true;
    return;
  }
  const root = document.documentElement;
  if (!root) {
    throw new Error("无法获取根节点");
  }
  root.classList.add(THEME_TRANSITION_CLASS);
  apply();
  if (themeTransitionTimer) {
    window.clearTimeout(themeTransitionTimer);
  }
  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
  }, THEME_TRANSITION_DURATION);
  hasAppliedTheme = true;
};
const buildDynamicScheme = (isDark) =>
  new DynamicScheme({
    sourceColorHct: Hct.fromInt(argbFromHex(currentThemeColor)),
    variant: Variant.NEUTRAL,
    isDark,
    contrastLevel: 0,
    specVersion: "2025",
  });
const applyDynamicTokens = (scheme) => {
  const root = document.documentElement;
  const colors = new MaterialDynamicColors();
  const colorList = [
    ...colors.allColors,
    colors.surfaceVariant(),
    colors.surfaceTint(),
    colors.shadow(),
    colors.scrim(),
  ].filter(Boolean);
  colorList.forEach((color) => {
    const token = color.name.replace(/_/g, "-");
    root.style.setProperty(
      `--md-sys-color-${token}`,
      hexFromArgb(color.getArgb(scheme)),
    );
  });
};
const applyMaterialTokens = (dark) => {
  const scheme = buildDynamicScheme(dark);
  applyDynamicTokens(scheme);
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
    runThemeTransition(() => {
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
      applyMaterialTokens(isDark);
    });
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
  runThemeTransition(() => {
    document.documentElement.setAttribute("data-theme", normalized);
    applyMaterialTokens(normalized === "dark");
  });
  return normalized;
};
export default applyTheme;
