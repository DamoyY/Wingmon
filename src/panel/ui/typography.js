import { styles as typescaleStyles } from "../../../node_modules/@material/web/typography/md-typescale-styles.js";

const headingClassMap = new Map([
  ["H1", "md-typescale-headline-medium"],
  ["H2", "md-typescale-headline-small"],
  ["H3", "md-typescale-title-large"],
  ["H4", "md-typescale-title-medium"],
  ["H5", "md-typescale-title-small"],
  ["H6", "md-typescale-body-medium"],
]);

const ensureElement = (element, label) => {
  if (!(element instanceof Element)) {
    throw new Error(`${label}无效`);
  }
  return element;
};

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

export const applyMessageHeadingTypography = (container) => {
  const target = ensureElement(container, "消息内容容器");
  target.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    const className = headingClassMap.get(heading.tagName);
    if (!className) {
      throw new Error(`未找到标题样式映射：${heading.tagName}`);
    }
    heading.classList.add(className);
  });
};

export default applyTypography;
