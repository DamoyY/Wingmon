import { styles as typescaleStyles } from "../../../node_modules/@material/web/typography/md-typescale-styles.js";

const ensureStylesheet = () => {
  const styleSheet = typescaleStyles?.styleSheet;
  if (!styleSheet) {
    throw new Error("无法加载 Material Typography 样式表");
  }
  return styleSheet;
};

const ensureAdoptedStyleSheets = () => {
  if (!Array.isArray(document.adoptedStyleSheets)) {
    throw new Error("当前环境不支持 adoptedStyleSheets");
  }
  return document.adoptedStyleSheets;
};

const applyTypography = () => {
  const styleSheet = ensureStylesheet();
  const sheets = ensureAdoptedStyleSheets();
  if (!sheets.includes(styleSheet)) {
    document.adoptedStyleSheets = [...sheets, styleSheet];
  }
};

export default applyTypography;
