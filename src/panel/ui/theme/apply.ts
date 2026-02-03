import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  Variant,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";
import {
  DEFAULT_THEME_COLOR,
  normalizeTheme,
  normalizeThemeColor,
} from "../../utils/index.js";

type ThemeMode = "light" | "dark" | "auto";
type ApplyCallback = () => void;
type ThemeColorInput = string | null | undefined;
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => void;
};
type DynamicColorItem = ReturnType<MaterialDynamicColors["surfaceVariant"]>;

const normalizeThemeSafe = normalizeTheme as (
  value: ThemeColorInput,
) => ThemeMode;
const normalizeThemeColorSafe = normalizeThemeColor as (
  value: ThemeColorInput,
) => string;
const defaultThemeColor = DEFAULT_THEME_COLOR as string;

let currentThemeColor: string = defaultThemeColor;
let hasAppliedTheme = false;
const THEME_TRANSITION_CLASS = "theme-transition";
const THEME_TRANSITION_DURATION = 240;
let themeTransitionTimer: ReturnType<typeof window.setTimeout> | null = null;

const shouldReduceMotion = (): boolean => {
    if (typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },
  runThemeTransition = (apply: ApplyCallback): void => {
    if (typeof apply !== "function") {
      throw new Error("主题应用器必须是函数");
    }
    if (!hasAppliedTheme || shouldReduceMotion()) {
      apply();
      hasAppliedTheme = true;
      return;
    }
    const viewTransitionDocument = document as DocumentWithViewTransition;
    if (typeof viewTransitionDocument.startViewTransition === "function") {
      viewTransitionDocument.startViewTransition(() => {
        apply();
      });
      hasAppliedTheme = true;
      return;
    }
    const root = document.documentElement as HTMLElement | null;
    if (!root) {
      throw new Error("无法获取根节点");
    }
    root.classList.add(THEME_TRANSITION_CLASS);
    apply();
    if (themeTransitionTimer !== null) {
      window.clearTimeout(themeTransitionTimer);
    }
    themeTransitionTimer = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, THEME_TRANSITION_DURATION);
    hasAppliedTheme = true;
  },
  buildDynamicScheme = (isDark: boolean): DynamicScheme =>
    new DynamicScheme({
      sourceColorHct: Hct.fromInt(argbFromHex(currentThemeColor)),
      variant: Variant.NEUTRAL,
      isDark,
      contrastLevel: 0,
      specVersion: "2025",
    }),
  applyDynamicTokens = (scheme: DynamicScheme): void => {
    const root = document.documentElement,
      colors = new MaterialDynamicColors(),
      colorList: Array<DynamicColorItem | null> = [
        ...colors.allColors,
        colors.surfaceVariant(),
        colors.surfaceTint(),
        colors.shadow(),
        colors.scrim(),
      ];
    colorList.forEach((color) => {
      if (!color) {
        return;
      }
      const token = color.name.replace(/_/g, "-");
      root.style.setProperty(
        `--md-sys-color-${token}`,
        hexFromArgb(color.getArgb(scheme)),
      );
    });
  },
  applyMaterialTokens = (dark: boolean): void => {
    const scheme = buildDynamicScheme(dark);
    applyDynamicTokens(scheme);
  };

let autoThemeListener: ((event?: MediaQueryListEvent) => void) | null = null;
let autoThemeMedia: MediaQueryList | null = null;

const stopAutoThemeSync = (): void => {
    if (!autoThemeMedia || !autoThemeListener) {
      autoThemeMedia = null;
      autoThemeListener = null;
      return;
    }
    if (typeof autoThemeMedia.removeEventListener !== "function") {
      throw new Error("无法移除系统主题监听");
    }
    autoThemeMedia.removeEventListener("change", autoThemeListener);
    autoThemeMedia = null;
    autoThemeListener = null;
  },
  startAutoThemeSync = (): void => {
    if (typeof window.matchMedia !== "function") {
      throw new Error("matchMedia 不可用，无法应用自动主题");
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)"),
      applySystemTheme = () => {
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
    if (typeof media.addEventListener !== "function") {
      throw new Error("无法监听系统主题变化");
    }
    media.addEventListener("change", applySystemTheme);
    autoThemeMedia = media;
    autoThemeListener = applySystemTheme;
  },
  applyTheme = (
    theme: ThemeColorInput,
    themeColor: ThemeColorInput = currentThemeColor,
  ): ThemeMode => {
    const normalized = normalizeThemeSafe(theme);
    currentThemeColor = normalizeThemeColorSafe(themeColor);
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
