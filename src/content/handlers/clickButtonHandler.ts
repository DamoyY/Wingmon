import { normalizeLlmId } from "../common/index.ts";
import type {
  ClickButtonRequest,
  ClickButtonResponse,
} from "../../shared/index.ts";

type SendResponse = (response: ClickButtonResponse) => void;
const findSingleButton = (normalizedId: string): HTMLElement | null => {
    const matches = document.querySelectorAll<HTMLElement>(
      `[data-llm-id="${normalizedId}"]`,
    );
    if (!matches.length) {
      return null;
    }
    if (matches.length > 1) {
      throw new Error(`找到多个 id 为 ${normalizedId} 的按钮`);
    }
    return matches[0];
  },
  handleClickButton = (
    message: ClickButtonRequest,
    sendResponse: SendResponse,
  ): void => {
    const normalizedId = normalizeLlmId(message.id ?? null),
      target = findSingleButton(normalizedId);
    if (!target) {
      sendResponse({ error: `未找到 id 为 ${normalizedId} 的按钮` });
      return;
    }
    target.click();
    sendResponse({ ok: true });
  };

export default handleClickButton;
