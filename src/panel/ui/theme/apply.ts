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
  DEFAULT_THEME_VARIANT,
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
  type ThemeMode,
  type ThemeVariant,
} from "../../utils/index.ts";
import { prefersReducedMotion } from "../core/index.ts";

type ApplyCallback = () => void;
type ThemeInput = string | null;
type ThemeColorInput = string | null;
type ThemeVariantInput = string | null;
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => void;
};
type DynamicColorItem = ReturnType<MaterialDynamicColors["surfaceVariant"]>;

const variantMap = {
  monochrome: Variant.MONOCHROME,
  neutral: Variant.NEUTRAL,
  tonal_spot: Variant.TONAL_SPOT,
  vibrant: Variant.VIBRANT,
  expressive: Variant.EXPRESSIVE,
  fidelity: Variant.FIDELITY,
  content: Variant.CONTENT,
  rainbow: Variant.RAINBOW,
  fruit_salad: Variant.FRUIT_SALAD,
} as const;

const defaultThemeColor = DEFAULT_THEME_COLOR;
const defaultThemeVariant = DEFAULT_THEME_VARIANT;

let currentThemeColor: string = defaultThemeColor;
let currentThemeVariant: ThemeVariant = defaultThemeVariant;
let hasAppliedTheme = false;
const THEME_TRANSITION_CLASS = "theme-transition";
const THEME_TRANSITION_DURATION = 240;
let themeTransitionTimer: ReturnType<typeof window.setTimeout> | null = null;

const runThemeTransition = (apply: ApplyCallback): void => {
    if (typeof apply !== "function") {
      throw new Error("主题应用器必须是函数");
    }
    if (!hasAppliedTheme || prefersReducedMotion()) {
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
      variant: variantMap[currentThemeVariant],
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
    theme: ThemeInput,
    themeColor: ThemeColorInput = currentThemeColor,
    themeVariant: ThemeVariantInput = currentThemeVariant,
  ): ThemeMode => {
    const normalized = normalizeTheme(theme);
    currentThemeColor = normalizeThemeColor(themeColor);
    currentThemeVariant = normalizeThemeVariant(themeVariant);
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
