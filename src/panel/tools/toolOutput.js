import { t } from "../utils/index.js";

const buildPageReadResult = ({
  headerLines,
  contentLabel,
  content,
  isInternal,
}) => {
  const header = headerLines.join("\n");
  if (isInternal) {
    return `${header}\n${t("statusReadFailedInternal")}`;
  }
  return `${header}\n${contentLabel}\n${content}`;
};

export const buildOpenPageAlreadyExistsOutput = (tabId) =>
  t("statusAlreadyExists", [String(tabId)]);

export const buildOpenPageReadOutput = ({
  title,
  tabId,
  content = "",
  isInternal,
}) =>
  buildPageReadResult({
    headerLines: [
      t("statusOpenSuccess"),
      `${t("statusTitle")}："${title}"；`,
      `${t("statusTabId")}："${tabId}"；`,
    ],
    contentLabel: `${t("statusContent")}：`,
    content,
    isInternal,
  });

export const buildClickButtonOutput = ({ title, content = "", isInternal }) =>
  buildPageReadResult({
    headerLines: [t("statusClickSuccess"), `${t("statusTitle")}："${title}"；`],
    contentLabel: `${t("statusContent")}：`,
    content,
    isInternal,
  });

export const buildPageMarkdownOutput = ({
  title,
  url,
  content = "",
  isInternal,
}) => {
  const headerLines = isInternal
    ? [t("statusTitleLabel"), title, "**URL：**", url]
    : [t("statusTitleLabel"), title, t("statusUrlLabel"), url];
  return buildPageReadResult({
    headerLines,
    contentLabel: t("statusContentLabel"),
    content,
    isInternal,
  });
};

export const buildListTabsOutput = (tabs) =>
  tabs
    .map((tab) => {
      const title = tab.title || t("statusNoTitle");
      const url = tab.url || t("statusNoAddress");
      const { id } = tab;
      return `${t("statusTitle")}: "${title}"\nURL: "${url}"\n${t("statusTabId")}: "${id}"`;
    })
    .join("\n\n");

export const buildToolErrorOutput = ({
  message,
  isInputError,
  isCloseTool,
}) => {
  if (!isInputError) {
    return "错误";
  }
  const fallback = t("statusFailed");
  if (isCloseTool) {
    return fallback;
  }
  const resolvedMessage = message || fallback;
  return `${fallback}: ${resolvedMessage}`;
};

export const defaultToolSuccessOutput = "成功";

export const buildClosePageOutput = () => t("statusSuccess");
