export type ThemeVariant =
  | "monochrome"
  | "neutral"
  | "tonal_spot"
  | "vibrant"
  | "expressive"
  | "fidelity"
  | "content"
  | "rainbow"
  | "fruit_salad";

export const DEFAULT_THEME_VARIANT: ThemeVariant = "neutral";

const allowedVariants = new Set<ThemeVariant>([
  "monochrome",
  "neutral",
  "tonal_spot",
  "vibrant",
  "expressive",
  "fidelity",
  "content",
  "rainbow",
  "fruit_salad",
]);

const normalizeThemeVariant = (value: unknown): ThemeVariant => {
  if (value === null || value === undefined) {
    return DEFAULT_THEME_VARIANT;
  }
  if (typeof value !== "string") {
    console.error("主题风格必须是字符串", value);
    return DEFAULT_THEME_VARIANT;
  }
  const normalized = value.trim().toLowerCase() as ThemeVariant;
  if (allowedVariants.has(normalized)) {
    return normalized;
  }
  console.error(`未知的主题风格：${value}`);
  return DEFAULT_THEME_VARIANT;
};

export default normalizeThemeVariant;
