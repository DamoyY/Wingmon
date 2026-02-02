const ensurePromptValue = (value) => {
  if (typeof value !== "string") {
    throw new Error("输入内容格式无效");
  }
  return value;
};

let promptContent = "";

export const setPromptContent = (value) => {
  promptContent = ensurePromptValue(value);
  return promptContent;
};

export const hasPromptContent = () =>
  Boolean(ensurePromptValue(promptContent).trim());

export const getPromptContent = () => ensurePromptValue(promptContent).trim();

export const clearPromptContent = () => {
  promptContent = "";
};
