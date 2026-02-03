import { argbFromHex, hexFromArgb } from "@material/material-color-utilities";

export const DEFAULT_THEME_COLOR = "#4eddb0";

const normalizeThemeColor = (value: unknown): string => {
  if (value === null || value === undefined) {
    return DEFAULT_THEME_COLOR;
  }
  if (typeof value !== "string") {
    throw new Error("主题色必须是字符串");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("主题色不能为空");
  }
  try {
    const argb = argbFromHex(trimmed);
    return hexFromArgb(argb);
  } catch {
    throw new Error("主题色格式不正确");
  }
};

export default normalizeThemeColor;
