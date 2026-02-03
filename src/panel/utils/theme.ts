const normalizeTheme = (theme: unknown): "light" | "dark" | "auto" =>
  theme === "light" || theme === "dark" || theme === "auto" ? theme : "auto";
export default normalizeTheme;
