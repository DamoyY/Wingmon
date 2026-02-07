import { t } from "../../lib/utils/index.ts";

type ToolErrorOutputArgs = {
  message?: string;
  isInputError: boolean;
  isCloseTool: boolean;
  isFindTool: boolean;
};

export const buildToolErrorOutput = ({
  message,
  isInputError,
  isCloseTool,
  isFindTool,
}: ToolErrorOutputArgs): string => {
  if (!isInputError) {
    return t("statusInternalToolError");
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
