import type { LocaleCode } from "./cobaltTypes.ts";
import { renderPolicyDocument } from "./cobaltRender.ts";
import { resolveInitialLocale } from "./cobaltLocale.ts";

const ensurePolicyRoot = (): HTMLElement => {
  const root = document.getElementById("policy-root");
  if (!(root instanceof HTMLElement)) {
    console.error("未找到隐私政策容器：policy-root");
    throw new Error("未找到隐私政策容器：policy-root");
  }
  return root;
};

const ensureLanguageButtons = (): HTMLButtonElement[] => {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-locale]"),
  );
  if (buttons.length < 2) {
    console.error("语言切换按钮数量不足");
    throw new Error("语言切换按钮数量不足");
  }
  return buttons;
};

const resolveButtonLocale = (button: HTMLButtonElement): LocaleCode =>
  button.dataset.locale === "zh" ? "zh" : "en";

const bootstrap = (): void => {
  const root = ensurePolicyRoot();
  const buttons = ensureLanguageButtons();
  let activeLocale = resolveInitialLocale(window.location.search);

  renderPolicyDocument(activeLocale, root);

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const nextLocale = resolveButtonLocale(button);
      if (nextLocale === activeLocale) {
        return;
      }
      activeLocale = nextLocale;
      renderPolicyDocument(activeLocale, root);
    });
  }
};

bootstrap();
