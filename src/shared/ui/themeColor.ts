import { argbFromHex, hexFromArgb } from "@material/material-color-utilities";

export const DEFAULT_THEME_COLOR = "#1c7ff8";
type ThemeColorInput = string | null;
type ThemeColorParseResult =
  | { status: "missing" }
  | { status: "empty" }
  | { status: "value"; value: string };

const parseThemeColorInput = (
  value: ThemeColorInput,
): ThemeColorParseResult => {
  if (value === null) {
    return { status: "missing" };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { status: "empty" };
  }
  return { status: "value", value: trimmed };
};

const normalizeThemeColorValue = (value: string): string => {
  try {
    const argb = argbFromHex(value);
    return hexFromArgb(argb);
  } catch {
    throw new Error("主题色格式不正确");
  }
};

const normalizeThemeColor = (value: ThemeColorInput): string => {
  const parsed = parseThemeColorInput(value);
  if (parsed.status === "missing") {
    return DEFAULT_THEME_COLOR;
  }
  if (parsed.status === "empty") {
    throw new Error("主题色不能为空");
  }
  return normalizeThemeColorValue(parsed.value);
};

export const normalizeThemeColorSafe = (value: ThemeColorInput): string => {
  const parsed = parseThemeColorInput(value);
  if (parsed.status !== "value") {
    return "";
  }
  try {
    return normalizeThemeColorValue(parsed.value);
  } catch (error) {
    console.error("主题色归一化失败", error);
    return parsed.value;
  }
};

export default normalizeThemeColor;
