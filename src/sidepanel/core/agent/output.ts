import { t } from "../../lib/utils/index.ts";

type ToolErrorOutputArgs = {
  message?: string;
  isInputError: boolean;
  isCloseTool: boolean;
  isFindTool: boolean;
  isOpenTool: boolean;
  tabId: number | null;
};

const resolveErrorMessage = (
    message: string | undefined,
    fallback: string,
  ): string => {
    if (typeof message !== "string") {
      return fallback;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      return fallback;
    }
    return trimmed;
  },
  resolveTabIdText = (tabId: number | null): string => {
    if (typeof tabId === "number" && Number.isInteger(tabId) && tabId > 0) {
      return String(tabId);
    }
    return t("statusUnknownTabId");
  },
  buildOpenPageFailureOutput = (
    message: string | undefined,
    tabId: number | null,
  ): string =>
    `${t("statusOpenFailed")}\n${t("statusTabId")}：\n${resolveTabIdText(tabId)}\n${t("statusErrorInfo")}：\n${resolveErrorMessage(message, t("statusFailed"))}`;

export const buildToolErrorOutput = ({
  message,
  isInputError,
  isCloseTool,
  isFindTool,
  isOpenTool,
  tabId,
}: ToolErrorOutputArgs): string => {
  if (!isInputError) {
    return t("statusInternalToolError");
  }
  if (isOpenTool) {
    return buildOpenPageFailureOutput(message, tabId);
  }
  if (isFindTool) {
    const resolvedMessage = message || t("statusFindInvalidArgs");
    return `${t("statusFindFailed")}\n${t("statusFindReasonLabel")}${resolvedMessage}`;
  }
  const fallback = t("statusFailed");
  if (isCloseTool) {
    return fallback;
  }
  const resolvedMessage = message || fallback;
  return `${fallback}: ${resolvedMessage}`;
};

export const defaultToolSuccessOutput = "成功";
