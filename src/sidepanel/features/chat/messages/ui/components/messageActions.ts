import { createMaterialIconButton } from "../../../../../lib/dom/index.ts";
import { t } from "../../../../../lib/utils/index.ts";
import type { MessageActionHandlers } from "../../actions.ts";

type MessageActionHandler = (indices: number[]) => Promise<void> | void;

type MessageErrorHandler = (error: Error) => void;

type ActionButtonConfig = {
  icon: string;
  className: string;
  title: string;
  onClick: () => Promise<void> | void;
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
  indices: number[],
  onError: MessageErrorHandler,
): Promise<void> => {
  try {
    await handler(indices);
  } catch (error) {
    onError(resolveActionError(error));
  }
};

const createActionButton = ({
  icon,
  className,
  title,
  onClick,
}: ActionButtonConfig): HTMLElement =>
  createMaterialIconButton({
    icon,
    className,
    title,
    onClick: (event) => {
      event.stopPropagation();
      void onClick();
    },
  });

export const createMessageActions = (
  indices: number[],
  handlers: MessageActionHandlers,
): HTMLDivElement => {
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new Error("消息索引无效");
  }
  const onCopy = toActionHandler(handlers.onCopy);
  const onDelete = toActionHandler(handlers.onDelete);
  const onError = toErrorHandler(handlers.onError);
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const copyButton = createActionButton({
    icon: "content_copy",
    className: "message-action message-copy",
    title: t("copy"),
    onClick: () => runAction(onCopy, indices, onError),
  });
  const deleteButton = createActionButton({
    icon: "delete",
    className: "message-action message-delete",
    title: t("delete"),
    onClick: () => runAction(onDelete, indices, onError),
  });
  actions.append(copyButton, deleteButton);
  return actions;
};
