export type ThemeMode = "light" | "dark" | "auto";

const normalizeTheme = (theme: string | null): ThemeMode =>
  theme === "light" || theme === "dark" || theme === "auto" ? theme : "auto";
export default normalizeTheme;
