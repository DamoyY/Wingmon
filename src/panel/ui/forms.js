import {
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  languageSelect,
  themeSelect,
  themeColorInput,
} from "./elements.js";
import { normalizeTheme, normalizeThemeColor } from "../utils/index.js";

const selectValue = (selectEl, value) => {
  selectEl.select(value);
};

const ensureString = (value, label) => {
  if (typeof value !== "string") {
    throw new Error(`${label}必须是字符串`);
  }
  return value;
};

const readInputValue = (input, label) => {
  if (!input) {
    throw new Error(`${label}输入框不存在`);
  }
  return ensureString(input.value, label);
};

const readSelectValue = (select, label) => {
  if (!select) {
    throw new Error(`${label}选择框不存在`);
  }
  return ensureString(select.value, label);
};

export const readSettingsFormValues = () => ({
  apiKey: readInputValue(keyInput, "API Key"),
  baseUrl: readInputValue(baseUrlInput, "Base URL"),
  model: readInputValue(modelInput, "模型"),
  apiType: readSelectValue(apiTypeSelect, "API 类型"),
  language: readSelectValue(languageSelect, "语言"),
  theme: readSelectValue(themeSelect, "主题"),
  themeColor: readInputValue(themeColorInput, "主题色"),
});

export const updateSettingsFormValues = (values) => {
  if (!values || typeof values !== "object") {
    throw new Error("设置表单更新必须提供对象");
  }
  if (Object.prototype.hasOwnProperty.call(values, "apiKey")) {
    keyInput.value = ensureString(values.apiKey, "API Key");
  }
  if (Object.prototype.hasOwnProperty.call(values, "baseUrl")) {
    baseUrlInput.value = ensureString(values.baseUrl, "Base URL");
  }
  if (Object.prototype.hasOwnProperty.call(values, "model")) {
    modelInput.value = ensureString(values.model, "模型");
  }
  if (Object.prototype.hasOwnProperty.call(values, "apiType")) {
    selectValue(apiTypeSelect, ensureString(values.apiType, "API 类型"));
  }
  if (Object.prototype.hasOwnProperty.call(values, "language")) {
    selectValue(languageSelect, ensureString(values.language, "语言"));
  }
  if (Object.prototype.hasOwnProperty.call(values, "theme")) {
    selectValue(themeSelect, ensureString(values.theme, "主题"));
  }
  if (Object.prototype.hasOwnProperty.call(values, "themeColor")) {
    themeColorInput.value = ensureString(values.themeColor, "主题色");
  }
};

const fillSettingsForm = (settings) => {
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  selectValue(apiTypeSelect, settings.apiType || "chat");
  selectValue(languageSelect, settings.language || "en");
  selectValue(themeSelect, normalizeTheme(settings.theme));
  themeColorInput.value = normalizeThemeColor(settings.themeColor);
};
export default fillSettingsForm;
