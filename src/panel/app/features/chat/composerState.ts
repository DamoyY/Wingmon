const ensurePromptValue = (value: string): string => {
  if (typeof value !== "string") {
    throw new Error("输入内容格式无效");
  }
  return value;
};

let promptContent = "";

export const setPromptContent = (value: string): string => {
  promptContent = ensurePromptValue(value);
  return promptContent;
};

export const hasPromptContent = (): boolean =>
  Boolean(ensurePromptValue(promptContent).trim());

export const getPromptContent = (): string =>
  ensurePromptValue(promptContent).trim();

export const clearPromptContent = (): void => {
  promptContent = "";
};
