import { elements } from "../foundation/elements.ts";
import { ensureElement } from "../../lib/utils/index.ts";

export const setSettingsStatus = (message: string): void => {
  const status = ensureElement(
    elements.keyStatus,
    "状态提示元素",
    "状态提示元素未找到",
  );
  status.textContent = message;
};

export const clearSettingsStatus = (): void => {
  setSettingsStatus("");
};

export const setSaveButtonVisible = (visible: boolean): void => {
  const saveKey = ensureElement(elements.saveKey, "保存按钮", "保存按钮未找到");
  saveKey.classList.toggle("hidden", !visible);
};

export const setCodexAuthModeVisible = (visible: boolean): void => {
  const apiCredentialFields = ensureElement(
      elements.apiCredentialFields,
      "API 凭据输入区域",
      "API 凭据输入区域未找到",
    ),
    codexAuthSection = ensureElement(
      elements.codexAuthSection,
      "Codex 登录区域",
      "Codex 登录区域未找到",
    );
  apiCredentialFields.classList.remove("hidden");
  codexAuthSection.classList.remove("hidden");
  apiCredentialFields.classList.toggle("settings-section-hidden", visible);
  codexAuthSection.classList.toggle("settings-section-hidden", !visible);
  apiCredentialFields.setAttribute("aria-hidden", String(visible));
  codexAuthSection.setAttribute("aria-hidden", String(!visible));
};

export const setCodexAuthStatus = (message: string): void => {
  const status = ensureElement(
    elements.codexAuthStatus,
    "Codex 登录状态元素",
    "Codex 登录状态元素未找到",
  );
  status.textContent = message;
};

export const setCodexLoginButtonBusy = (busy: boolean): void => {
  const button = ensureElement(
    elements.codexLoginButton,
    "Codex 登录按钮",
    "Codex 登录按钮未找到",
  );
  button.disabled = busy;
};

export const setCodexLoginButtonText = (label: string): void => {
  const button = ensureElement(
    elements.codexLoginButton,
    "Codex 登录按钮",
    "Codex 登录按钮未找到",
  );
  button.textContent = label;
};
