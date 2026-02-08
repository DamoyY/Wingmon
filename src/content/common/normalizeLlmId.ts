const llmIdPattern = /^[0-9a-z]+$/u;

export const normalizeLlmId = (id: string | null): string => {
  const normalizedId = id?.trim() ?? "";
  if (!normalizedId) {
    throw new Error("id 必须是非空字符串");
  }
  if (!llmIdPattern.test(normalizedId)) {
    throw new Error("id 仅支持字母数字");
  }
  return normalizedId.toLowerCase();
};
