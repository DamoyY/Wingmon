import {
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
} from "./elements.js";
import { normalizeTheme } from "../utils/index.js";

const fillSettingsForm = (settings) => {
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  apiTypeSelect.value = settings.apiType || "chat";
  themeSelect.value = normalizeTheme(settings.theme);
};
export default fillSettingsForm;
