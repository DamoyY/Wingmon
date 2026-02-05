import { argbFromHex, hexFromArgb } from "@material/material-color-utilities";

export const DEFAULT_THEME_COLOR = "#1c7ff8";

type ThemeColorParseResult =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "empty" }
  | { status: "value"; value: string };

const parseThemeColorInput = (value: unknown): ThemeColorParseResult => {
  if (value === null || value === undefined) {
    return { status: "missing" };
  }
  if (typeof value !== "string") {
    return { status: "invalid" };
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

const normalizeThemeColor = (value: unknown): string => {
  const parsed = parseThemeColorInput(value);
  if (parsed.status === "missing") {
    return DEFAULT_THEME_COLOR;
  }
  if (parsed.status === "invalid") {
    throw new Error("主题色必须是字符串");
  }
  if (parsed.status === "empty") {
    throw new Error("主题色不能为空");
  }
  return normalizeThemeColorValue(parsed.value);
};

export const normalizeThemeColorSafe = (value: unknown): string => {
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
