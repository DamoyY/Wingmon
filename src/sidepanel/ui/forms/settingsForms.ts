import { elements } from "../core/elements.ts";
import {
  ensureElement,
  normalizeTheme,
  normalizeThemeColor,
  normalizeThemeVariant,
} from "../../lib/utils/index.ts";

type TextInputElement = HTMLElement & { value: string };
type SelectElement = HTMLElement & {
  value: string;
  select: (value: string) => void;
};
type FormElement = TextInputElement | SelectElement;

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

type SettingsFormField = keyof SettingsFormValues;

type FieldDescriptor = {
  field: SettingsFormField;
  label: string;
  elementLabel: string;
  getElement: () => FormElement;
  resolveFillValue: (settings: SettingsFormValues) => string;
};

type ResolvedFieldDescriptor = FieldDescriptor & { element: FormElement };

const ensureString = (value: string | undefined, label: string): string => {
    if (typeof value !== "string") {
      throw new Error(`${label}必须是字符串`);
    }
    return value;
  },
  isSelectElement = (element: FormElement): element is SelectElement =>
    typeof (element as SelectElement).select === "function",
  applyElementValue = (element: FormElement, value: string): void => {
    if (isSelectElement(element)) {
      element.select(value);
      return;
    }
    element.value = value;
  },
  settingsFormFieldDescriptors: readonly FieldDescriptor[] = [
    {
      field: "apiKey",
      label: "API Key",
      elementLabel: "API Key 输入框",
      getElement: () => elements.keyInput as TextInputElement,
      resolveFillValue: (settings) => settings.apiKey || "",
    },
    {
      field: "baseUrl",
      label: "Base URL",
      elementLabel: "Base URL 输入框",
      getElement: () => elements.baseUrlInput as TextInputElement,
      resolveFillValue: (settings) => settings.baseUrl || "",
    },
    {
      field: "model",
      label: "模型",
      elementLabel: "模型输入框",
      getElement: () => elements.modelInput as TextInputElement,
      resolveFillValue: (settings) => settings.model || "",
    },
    {
      field: "apiType",
      label: "API 类型",
      elementLabel: "API 类型选择框",
      getElement: () => elements.apiTypeSelect as SelectElement,
      resolveFillValue: (settings) => settings.apiType || "chat",
    },
    {
      field: "language",
      label: "语言",
      elementLabel: "语言选择框",
      getElement: () => elements.languageSelect as SelectElement,
      resolveFillValue: (settings) => settings.language || "en",
    },
    {
      field: "theme",
      label: "主题",
      elementLabel: "主题选择框",
      getElement: () => elements.themeSelect as SelectElement,
      resolveFillValue: (settings) => normalizeTheme(settings.theme),
    },
    {
      field: "themeColor",
      label: "主题色",
      elementLabel: "主题色输入框",
      getElement: () => elements.themeColorInput as TextInputElement,
      resolveFillValue: (settings) => normalizeThemeColor(settings.themeColor),
    },
    {
      field: "themeVariant",
      label: "Variant",
      elementLabel: "Variant 选择框",
      getElement: () => elements.themeVariantSelect as SelectElement,
      resolveFillValue: (settings) =>
        normalizeThemeVariant(settings.themeVariant),
    },
  ],
  resolveFieldDescriptors = (): ResolvedFieldDescriptor[] =>
    settingsFormFieldDescriptors.map((descriptor) => ({
      ...descriptor,
      element: ensureElement(
        descriptor.getElement(),
        descriptor.elementLabel,
        `${descriptor.elementLabel}未找到`,
      ),
    })),
  createEmptySettingsFormValues = (): SettingsFormValues => ({
    apiKey: "",
    baseUrl: "",
    model: "",
    apiType: "",
    language: "",
    theme: "",
    themeColor: "",
    themeVariant: "",
  });

export const readSettingsFormValues = (): SettingsFormValues => {
  const values = createEmptySettingsFormValues();
  for (const descriptor of resolveFieldDescriptors()) {
    values[descriptor.field] = ensureString(
      descriptor.element.value,
      descriptor.label,
    );
  }
  return values;
};

export const updateSettingsFormValues = (
  values: Partial<SettingsFormValues>,
): void => {
  for (const descriptor of resolveFieldDescriptors()) {
    if (!Object.hasOwn(values, descriptor.field)) {
      continue;
    }
    applyElementValue(
      descriptor.element,
      ensureString(values[descriptor.field], descriptor.label),
    );
  }
};

const fillSettingsForm = (settings: SettingsFormValues): void => {
  for (const descriptor of resolveFieldDescriptors()) {
    applyElementValue(
      descriptor.element,
      descriptor.resolveFillValue(settings),
    );
  }
};

export default fillSettingsForm;
