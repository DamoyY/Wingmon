import { parseIndicesKey, t } from "../../../../../lib/utils/index.ts";
import type { MessageActionHandlers } from "../../actions.ts";
import { createMaterialIconButton } from "../../../../../lib/domTools/index.ts";

type MessageActionHandler = (indices: number[]) => Promise<void> | void;

type MessageErrorHandler = (error: Error) => void;

type ActionButtonConfig = {
  icon: string;
  className: string;
  title: string;
  onClick: (button: HTMLElement) => Promise<void> | void;
};

const resolveActionError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }
  return new Error(t("actionFailed"));
};

const toActionHandler =
  (
    handler:
      | MessageActionHandlers["onCopy"]
      | MessageActionHandlers["onDelete"],
  ): MessageActionHandler =>
  (indices: number[]) =>
    handler(indices);

const toErrorHandler =
  (handler: MessageActionHandlers["onError"]): MessageErrorHandler =>
  (error: Error) => {
    handler(error);
  };

const runAction = async (
  handler: MessageActionHandler,
  button: HTMLElement,
  onError: MessageErrorHandler,
): Promise<void> => {
  try {
    await handler(resolveActionIndices(button));
  } catch (error) {
    onError(resolveActionError(error));
  }
};

const resolveActionIndices = (button: HTMLElement): number[] => {
  const row = button.closest(".message-row");
  if (!(row instanceof HTMLElement)) {
    throw new Error("消息行容器无效");
  }
  const indicesKey = row.dataset.indices;
  if (typeof indicesKey !== "string" || indicesKey.trim().length === 0) {
    throw new Error("消息索引缺失");
  }
  return parseIndicesKey(indicesKey);
};

const createActionButton = ({
  icon,
  className,
  title,
  onClick,
}: ActionButtonConfig): HTMLElement =>
  createMaterialIconButton({
    className,
    icon,
    onClick: (event) => {
      event.stopPropagation();
      if (!(event.currentTarget instanceof HTMLElement)) {
        throw new Error("消息操作按钮无效");
      }
      void onClick(event.currentTarget);
    },
    title,
  });

export const createMessageActions = (
  handlers: MessageActionHandlers,
): HTMLDivElement => {
  const onCopy = toActionHandler(handlers.onCopy);
  const onDelete = toActionHandler(handlers.onDelete);
  const onError = toErrorHandler(handlers.onError);
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const copyButton = createActionButton({
    className: "message-action message-copy",
    icon: "content_copy",
    onClick: (button) => runAction(onCopy, button, onError),
    title: t("copy"),
  });
  const deleteButton = createActionButton({
    className: "message-action message-delete",
    icon: "delete",
    onClick: (button) => runAction(onDelete, button, onError),
    title: t("delete"),
  });
  actions.append(copyButton, deleteButton);
  return actions;
};
