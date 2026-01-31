import { t } from "../utils/index.js";

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
