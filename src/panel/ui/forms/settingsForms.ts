import { elements } from "../core/elements.ts";
import {
  ensureElement,
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
} from "../../utils/index.ts";

type TextInputElement = HTMLElement & { value: string };
type SelectElement = HTMLElement & {
  value: string;
  select: (value: string) => void;
};

type SettingsFormValues = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: string;
  language: string;
  theme: string;
  themeColor: string;
  themeVariant: string;
};

const selectValue = (selectEl: SelectElement, value: string) => {
    selectEl.select(value);
  },
  ensureString = (value: unknown, label: string) => {
    if (typeof value !== "string") {
      throw new Error(`${label}必须是字符串`);
    }
    return value;
  },
  readInputValue = (input: TextInputElement | null, label: string): string => {
    if (!input) {
      throw new Error(`${label}输入框不存在`);
    }
    return ensureString(input.value, label);
  },
  readSelectValue = (select: SelectElement | null, label: string): string => {
    if (!select) {
      throw new Error(`${label}选择框不存在`);
    }
    return ensureString(select.value, label);
  };

export const readSettingsFormValues = (): SettingsFormValues => ({
  apiKey: readInputValue(elements.keyInput as TextInputElement, "API Key"),
  baseUrl: readInputValue(
    elements.baseUrlInput as TextInputElement,
    "Base URL",
  ),
  model: readInputValue(elements.modelInput as TextInputElement, "模型"),
  apiType: readSelectValue(elements.apiTypeSelect as SelectElement, "API 类型"),
  language: readSelectValue(elements.languageSelect as SelectElement, "语言"),
  theme: readSelectValue(elements.themeSelect as SelectElement, "主题"),
  themeColor: readInputValue(
    elements.themeColorInput as TextInputElement,
    "主题色",
  ),
  themeVariant: readSelectValue(
    elements.themeVariantSelect as SelectElement,
    "Variant",
  ),
});

export const updateSettingsFormValues = (
  values: Partial<SettingsFormValues>,
) => {
  const keyInput = ensureElement(
      elements.keyInput as TextInputElement,
      "API Key 输入框",
      "API Key 输入框未找到",
    ),
    baseUrlInput = ensureElement(
      elements.baseUrlInput as TextInputElement,
      "Base URL 输入框",
      "Base URL 输入框未找到",
    ),
    modelInput = ensureElement(
      elements.modelInput as TextInputElement,
      "模型输入框",
      "模型输入框未找到",
    ),
    apiTypeSelect = ensureElement(
      elements.apiTypeSelect as SelectElement,
      "API 类型选择框",
      "API 类型选择框未找到",
    ),
    languageSelect = ensureElement(
      elements.languageSelect as SelectElement,
      "语言选择框",
      "语言选择框未找到",
    ),
    themeSelect = ensureElement(
      elements.themeSelect as SelectElement,
      "主题选择框",
      "主题选择框未找到",
    ),
    themeColorInput = ensureElement(
      elements.themeColorInput as TextInputElement,
      "主题色输入框",
      "主题色输入框未找到",
    ),
    themeVariantSelect = ensureElement(
      elements.themeVariantSelect as SelectElement,
      "Variant 选择框",
      "Variant 选择框未找到",
    );
  if (Object.hasOwn(values, "apiKey")) {
    keyInput.value = ensureString(values.apiKey, "API Key");
  }
  if (Object.hasOwn(values, "baseUrl")) {
    baseUrlInput.value = ensureString(values.baseUrl, "Base URL");
  }
  if (Object.hasOwn(values, "model")) {
    modelInput.value = ensureString(values.model, "模型");
  }
  if (Object.hasOwn(values, "apiType")) {
    selectValue(apiTypeSelect, ensureString(values.apiType, "API 类型"));
  }
  if (Object.hasOwn(values, "language")) {
    selectValue(languageSelect, ensureString(values.language, "语言"));
  }
  if (Object.hasOwn(values, "theme")) {
    selectValue(themeSelect, ensureString(values.theme, "主题"));
  }
  if (Object.hasOwn(values, "themeColor")) {
    themeColorInput.value = ensureString(values.themeColor, "主题色");
  }
  if (Object.hasOwn(values, "themeVariant")) {
    selectValue(
      themeVariantSelect,
      ensureString(values.themeVariant, "Variant"),
    );
  }
};

const fillSettingsForm = (settings: SettingsFormValues) => {
  const keyInput = ensureElement(
      elements.keyInput as TextInputElement,
      "API Key 输入框",
      "API Key 输入框未找到",
    ),
    baseUrlInput = ensureElement(
      elements.baseUrlInput as TextInputElement,
      "Base URL 输入框",
      "Base URL 输入框未找到",
    ),
    modelInput = ensureElement(
      elements.modelInput as TextInputElement,
      "模型输入框",
      "模型输入框未找到",
    ),
    apiTypeSelect = ensureElement(
      elements.apiTypeSelect as SelectElement,
      "API 类型选择框",
      "API 类型选择框未找到",
    ),
    languageSelect = ensureElement(
      elements.languageSelect as SelectElement,
      "语言选择框",
      "语言选择框未找到",
    ),
    themeSelect = ensureElement(
      elements.themeSelect as SelectElement,
      "主题选择框",
      "主题选择框未找到",
    ),
    themeColorInput = ensureElement(
      elements.themeColorInput as TextInputElement,
      "主题色输入框",
      "主题色输入框未找到",
    ),
    themeVariantSelect = ensureElement(
      elements.themeVariantSelect as SelectElement,
      "Variant 选择框",
      "Variant 选择框未找到",
    );
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  selectValue(apiTypeSelect, settings.apiType || "chat");
  selectValue(languageSelect, settings.language || "en");
  selectValue(themeSelect, normalizeTheme(settings.theme));
  themeColorInput.value = normalizeThemeColor(settings.themeColor);
  selectValue(themeVariantSelect, normalizeThemeVariant(settings.themeVariant));
};
export default fillSettingsForm;
