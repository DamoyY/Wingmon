import {
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
  themeColorInput,
} from "./elements.js";
import { normalizeTheme, normalizeThemeColor } from "../utils/index.js";

const selectValue = (selectEl, value) => {
  selectEl.select(value);
};

const fillSettingsForm = (settings) => {
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  selectValue(apiTypeSelect, settings.apiType || "chat");
  selectValue(themeSelect, normalizeTheme(settings.theme));
  themeColorInput.value = normalizeThemeColor(settings.themeColor);
};
export default fillSettingsForm;
