const EXCLUDED_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
]);
const TEXT_INPUT_ROLES = new Set(["textbox", "searchbox", "combobox"]);

export { EXCLUDED_INPUT_TYPES, TEXT_INPUT_ROLES };
