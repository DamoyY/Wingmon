import { elements } from "../core/elements.js";
import { normalizeTheme, normalizeThemeColor } from "../../utils/index.js";

const selectValue = (selectEl, value) => {
    selectEl.select(value);
  },
  ensureString = (value, label) => {
    if (typeof value !== "string") {
      throw new Error(`${label}必须是字符串`);
    }
    return value;
  },
  ensureElement = (element, label) => {
    if (!element) {
      throw new Error(`${label}未找到`);
    }
    return element;
  },
  readInputValue = (input, label) => {
    if (!input) {
      throw new Error(`${label}输入框不存在`);
    }
    return ensureString(input.value, label);
  },
  readSelectValue = (select, label) => {
    if (!select) {
      throw new Error(`${label}选择框不存在`);
    }
    return ensureString(select.value, label);
  };

export const readSettingsFormValues = () => ({
  apiKey: readInputValue(elements.keyInput, "API Key"),
  baseUrl: readInputValue(elements.baseUrlInput, "Base URL"),
  model: readInputValue(elements.modelInput, "模型"),
  apiType: readSelectValue(elements.apiTypeSelect, "API 类型"),
  language: readSelectValue(elements.languageSelect, "语言"),
  theme: readSelectValue(elements.themeSelect, "主题"),
  themeColor: readInputValue(elements.themeColorInput, "主题色"),
});

export const updateSettingsFormValues = (values) => {
  if (!values || typeof values !== "object") {
    throw new Error("设置表单更新必须提供对象");
  }
  const keyInput = ensureElement(elements.keyInput, "API Key 输入框"),
    baseUrlInput = ensureElement(elements.baseUrlInput, "Base URL 输入框"),
    modelInput = ensureElement(elements.modelInput, "模型输入框"),
    apiTypeSelect = ensureElement(elements.apiTypeSelect, "API 类型选择框"),
    languageSelect = ensureElement(elements.languageSelect, "语言选择框"),
    themeSelect = ensureElement(elements.themeSelect, "主题选择框"),
    themeColorInput = ensureElement(elements.themeColorInput, "主题色输入框");
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
};

const fillSettingsForm = (settings) => {
  const keyInput = ensureElement(elements.keyInput, "API Key 输入框"),
    baseUrlInput = ensureElement(elements.baseUrlInput, "Base URL 输入框"),
    modelInput = ensureElement(elements.modelInput, "模型输入框"),
    apiTypeSelect = ensureElement(elements.apiTypeSelect, "API 类型选择框"),
    languageSelect = ensureElement(elements.languageSelect, "语言选择框"),
    themeSelect = ensureElement(elements.themeSelect, "主题选择框"),
    themeColorInput = ensureElement(elements.themeColorInput, "主题色输入框");
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  selectValue(apiTypeSelect, settings.apiType || "chat");
  selectValue(languageSelect, settings.language || "en");
  selectValue(themeSelect, normalizeTheme(settings.theme));
  themeColorInput.value = normalizeThemeColor(settings.themeColor);
};
export default fillSettingsForm;
