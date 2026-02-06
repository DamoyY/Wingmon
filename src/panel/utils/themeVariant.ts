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
type ThemeVariantInput = string | null;

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

const normalizeThemeVariant = (value: ThemeVariantInput): ThemeVariant => {
  if (value == null) {
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
