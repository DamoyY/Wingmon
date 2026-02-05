import { t } from "../utils/index.ts";

export const buildToolErrorOutput = ({
  message,
  isInputError,
  isCloseTool,
}) => {
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
