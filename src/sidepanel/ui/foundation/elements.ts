import type { MdDialog } from "@material/web/dialog/dialog.js";
import type { MdFilledButton } from "@material/web/button/filled-button.js";
import type { MdFilledSelect } from "@material/web/select/filled-select.js";
import type { MdFilledTextField } from "@material/web/textfield/filled-text-field.js";
import type { MdIconButton } from "@material/web/iconbutton/icon-button.js";
import type { MdList } from "@material/web/list/list.js";
import type { MdSwitch } from "@material/web/switch/switch.js";
import { requireElementById } from "../../lib/utils/index.ts";

const ensureDomReady = (): Promise<void> => {
  if (document.readyState !== "loading") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        resolve();
      },
      {
        once: true,
      },
    );
  });
};

export type PanelElements = {
  keyView: HTMLElement;
  historyView: HTMLElement;
  chatView: HTMLElement;
  topBar: HTMLDivElement;
  topTitle: HTMLDivElement;
  bottomBar: HTMLDivElement;
  followModeSwitch: MdSwitch;
  apiCredentialFields: HTMLDivElement;
  keyInput: MdFilledTextField;
  baseUrlInput: MdFilledTextField;
  codexAuthSection: HTMLDivElement;
  codexAuthStatus: HTMLParagraphElement;
  codexLoginButton: MdFilledButton;
  modelInput: MdFilledTextField;
  requestBodyOverridesInput: MdFilledTextField;
  apiTypeSelect: MdFilledSelect;
  languageSelect: MdFilledSelect;
  themeSelect: MdFilledSelect;
  themeColorInput: MdFilledTextField;
  themeVariantSelect: MdFilledSelect;
  keyStatus: HTMLDivElement;
  settingsHint: HTMLParagraphElement;
  openSettings: MdIconButton;
  saveKey: MdFilledButton;
  cancelSettings: MdIconButton;
  messagesEl: HTMLDivElement;
  emptyState: HTMLDivElement;
  promptEl: MdFilledTextField;
  sendButton: MdFilledButton;
  sendWithPageButton: MdFilledButton;
  stopButton: MdFilledButton;
  newChatButton: MdIconButton;
  historyButton: MdIconButton;
  closeHistoryButton: MdIconButton;
  historyList: MdList;
  confirmDialog: MdDialog;
  confirmMessage: HTMLParagraphElement;
};

export const elements = {} as PanelElements;

let initPromise: Promise<PanelElements> | null = null;

const resolveElements = (): PanelElements => ({
  apiCredentialFields: requireElementById(
    "api-credential-fields",
    "apiCredentialFields",
  ) as HTMLDivElement,
  apiTypeSelect: requireElementById(
    "api-type-select",
    "apiTypeSelect",
  ) as MdFilledSelect,
  baseUrlInput: requireElementById(
    "base-url-input",
    "baseUrlInput",
  ) as MdFilledTextField,
  bottomBar: requireElementById("bottom-bar", "bottomBar") as HTMLDivElement,
  cancelSettings: requireElementById(
    "cancel-settings",
    "cancelSettings",
  ) as MdIconButton,
  chatView: requireElementById("chat-view", "chatView"),
  closeHistoryButton: requireElementById(
    "close-history",
    "closeHistoryButton",
  ) as MdIconButton,
  codexAuthSection: requireElementById(
    "codex-auth-section",
    "codexAuthSection",
  ) as HTMLDivElement,
  codexAuthStatus: requireElementById(
    "codex-auth-status",
    "codexAuthStatus",
  ) as HTMLParagraphElement,
  codexLoginButton: requireElementById(
    "codex-login-button",
    "codexLoginButton",
  ) as MdFilledButton,
  confirmDialog: requireElementById(
    "confirm-dialog",
    "confirmDialog",
  ) as MdDialog,
  confirmMessage: requireElementById(
    "confirm-message",
    "confirmMessage",
  ) as HTMLParagraphElement,
  emptyState: requireElementById("empty-state", "emptyState") as HTMLDivElement,
  followModeSwitch: requireElementById(
    "follow-mode",
    "followModeSwitch",
  ) as MdSwitch,
  historyButton: requireElementById("history", "historyButton") as MdIconButton,
  historyList: requireElementById("history-list", "historyList") as MdList,
  historyView: requireElementById("history-view", "historyView"),
  keyInput: requireElementById(
    "api-key-input",
    "keyInput",
  ) as MdFilledTextField,
  keyStatus: requireElementById("key-status", "keyStatus") as HTMLDivElement,
  keyView: requireElementById("key-view", "keyView"),
  languageSelect: requireElementById(
    "language-select",
    "languageSelect",
  ) as MdFilledSelect,
  messagesEl: requireElementById("messages", "messagesEl") as HTMLDivElement,
  modelInput: requireElementById(
    "model-input",
    "modelInput",
  ) as MdFilledTextField,
  newChatButton: requireElementById(
    "new-chat",
    "newChatButton",
  ) as MdIconButton,
  openSettings: requireElementById(
    "open-settings",
    "openSettings",
  ) as MdIconButton,
  promptEl: requireElementById("prompt", "promptEl") as MdFilledTextField,
  requestBodyOverridesInput: requireElementById(
    "request-body-overrides-input",
    "requestBodyOverridesInput",
  ) as MdFilledTextField,
  saveKey: requireElementById("save-key", "saveKey") as MdFilledButton,
  sendButton: requireElementById("send", "sendButton") as MdFilledButton,
  sendWithPageButton: requireElementById(
    "send-with-page",
    "sendWithPageButton",
  ) as MdFilledButton,
  settingsHint: requireElementById(
    "settings-hint",
    "settingsHint",
  ) as HTMLParagraphElement,
  stopButton: requireElementById("stop", "stopButton") as MdFilledButton,
  themeColorInput: requireElementById(
    "theme-color-input",
    "themeColorInput",
  ) as MdFilledTextField,
  themeSelect: requireElementById(
    "theme-select",
    "themeSelect",
  ) as MdFilledSelect,
  themeVariantSelect: requireElementById(
    "theme-variant-select",
    "themeVariantSelect",
  ) as MdFilledSelect,
  topBar: requireElementById("top-bar", "topBar") as HTMLDivElement,
  topTitle: requireElementById("top-title", "topTitle") as HTMLDivElement,
});

export const initElements = async (): Promise<PanelElements> => {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    await ensureDomReady();
    Object.assign(elements, resolveElements());
    return elements;
  })();
  return initPromise;
};
