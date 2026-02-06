import { t } from "../utils/index.ts";

type ToolErrorOutputArgs = {
  message?: string;
  isInputError: boolean;
  isCloseTool: boolean;
};

export const buildToolErrorOutput = ({
  message,
  isInputError,
  isCloseTool,
}: ToolErrorOutputArgs): string => {
  if (!isInputError) {
    return t("statusInternalToolError");
  }
  const fallback = t("statusFailed");
  if (isCloseTool) {
    return fallback;
  }
  const resolvedMessage = message || fallback;
  return `${fallback}: ${resolvedMessage}`;
};

export const defaultToolSuccessOutput = "成功";
