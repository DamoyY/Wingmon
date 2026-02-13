import enContent from "../../../public/system-prompt_en.md";
import zhCnContent from "../../../public/system-prompt_zh-CN.md";

type SupportedPromptLanguage = "zh_CN" | "en";

const promptContents: Record<SupportedPromptLanguage, string> = {
    en: enContent,
    zh_CN: zhCnContent,
  },
  normalizeLanguage = (language: string): string =>
    language.trim().toLowerCase().replaceAll("-", "_"),
  resolvePromptLanguage = (language: string): SupportedPromptLanguage => {
    const normalized = normalizeLanguage(language);
    if (normalized.startsWith("zh")) {
      return "zh_CN";
    }
    if (normalized.startsWith("en")) {
      return "en";
    }
    return "en";
  };

export const resolveSystemPromptContent = (language: string): string =>
  promptContents[resolvePromptLanguage(language)];
