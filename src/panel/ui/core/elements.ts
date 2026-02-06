import type { MdFilledButton } from "@material/web/button/filled-button.js";
import type { MdDialog } from "@material/web/dialog/dialog.js";
import type { MdIconButton } from "@material/web/iconbutton/icon-button.js";
import type { MdList } from "@material/web/list/list.js";
import type { MdFilledSelect } from "@material/web/select/filled-select.js";
import type { MdSwitch } from "@material/web/switch/switch.js";
import type { MdFilledTextField } from "@material/web/textfield/filled-text-field.js";
import { requireElementById } from "../../utils/index.ts";

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
  keyInput: MdFilledTextField;
  baseUrlInput: MdFilledTextField;
  modelInput: MdFilledTextField;
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
  keyView: requireElementById("key-view", "keyView"),
  historyView: requireElementById("history-view", "historyView"),
  chatView: requireElementById("chat-view", "chatView"),
  topBar: requireElementById("top-bar", "topBar") as HTMLDivElement,
  topTitle: requireElementById("top-title", "topTitle") as HTMLDivElement,
  bottomBar: requireElementById("bottom-bar", "bottomBar") as HTMLDivElement,
  followModeSwitch: requireElementById(
    "follow-mode",
    "followModeSwitch",
  ) as MdSwitch,
  keyInput: requireElementById(
    "api-key-input",
    "keyInput",
  ) as MdFilledTextField,
  baseUrlInput: requireElementById(
    "base-url-input",
    "baseUrlInput",
  ) as MdFilledTextField,
  modelInput: requireElementById(
    "model-input",
    "modelInput",
  ) as MdFilledTextField,
  apiTypeSelect: requireElementById(
    "api-type-select",
    "apiTypeSelect",
  ) as MdFilledSelect,
  languageSelect: requireElementById(
    "language-select",
    "languageSelect",
  ) as MdFilledSelect,
  themeSelect: requireElementById(
    "theme-select",
    "themeSelect",
  ) as MdFilledSelect,
  themeColorInput: requireElementById(
    "theme-color-input",
    "themeColorInput",
  ) as MdFilledTextField,
  themeVariantSelect: requireElementById(
    "theme-variant-select",
    "themeVariantSelect",
  ) as MdFilledSelect,
  keyStatus: requireElementById("key-status", "keyStatus") as HTMLDivElement,
  settingsHint: requireElementById(
    "settings-hint",
    "settingsHint",
  ) as HTMLParagraphElement,
  openSettings: requireElementById(
    "open-settings",
    "openSettings",
  ) as MdIconButton,
  saveKey: requireElementById("save-key", "saveKey") as MdFilledButton,
  cancelSettings: requireElementById(
    "cancel-settings",
    "cancelSettings",
  ) as MdIconButton,
  messagesEl: requireElementById("messages", "messagesEl") as HTMLDivElement,
  emptyState: requireElementById("empty-state", "emptyState") as HTMLDivElement,
  promptEl: requireElementById("prompt", "promptEl") as MdFilledTextField,
  sendButton: requireElementById("send", "sendButton") as MdFilledButton,
  sendWithPageButton: requireElementById(
    "send-with-page",
    "sendWithPageButton",
  ) as MdFilledButton,
  stopButton: requireElementById("stop", "stopButton") as MdFilledButton,
  newChatButton: requireElementById(
    "new-chat",
    "newChatButton",
  ) as MdIconButton,
  historyButton: requireElementById("history", "historyButton") as MdIconButton,
  closeHistoryButton: requireElementById(
    "close-history",
    "closeHistoryButton",
  ) as MdIconButton,
  historyList: requireElementById("history-list", "historyList") as MdList,
  confirmDialog: requireElementById(
    "confirm-dialog",
    "confirmDialog",
  ) as MdDialog,
  confirmMessage: requireElementById(
    "confirm-message",
    "confirmMessage",
  ) as HTMLParagraphElement,
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
