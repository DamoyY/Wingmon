const normalizeTheme = (theme) =>
  theme === "light" || theme === "dark" || theme === "auto" ? theme : "auto";
export default normalizeTheme;
