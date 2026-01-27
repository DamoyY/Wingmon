import {
  keyInput,
  baseUrlInput,
  modelInput,
  apiTypeSelect,
  themeSelect,
} from "./elements";
import normalizeTheme from "../utils/theme";

const fillSettingsForm = (settings) => {
  keyInput.value = settings.apiKey || "";
  baseUrlInput.value = settings.baseUrl || "";
  modelInput.value = settings.model || "";
  apiTypeSelect.value = settings.apiType || "chat";
  themeSelect.value = normalizeTheme(settings.theme);
};
export default fillSettingsForm;
