import {
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
} from "./elements.js";
import { normalizeTheme } from "../utils/index.js";

const selectValue = (selectEl, value) => {
  selectEl.select(value);
};

const fillSettingsForm = (settings) => {
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  selectValue(apiTypeSelect, settings.apiType || "chat");
  selectValue(themeSelect, normalizeTheme(settings.theme));
};
export default fillSettingsForm;
