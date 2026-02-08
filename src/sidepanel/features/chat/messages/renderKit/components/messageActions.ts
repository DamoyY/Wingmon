import type { MessageActionHandlers } from "../../actions.ts";
import { createMaterialIconButton } from "../../../../../lib/domTools/index.ts";
import { t } from "../../../../../lib/utils/index.ts";

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
    className,
    icon,
    onClick: (event) => {
      event.stopPropagation();
      void onClick();
    },
    title,
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
    className: "message-action message-copy",
    icon: "content_copy",
    onClick: () => runAction(onCopy, indices, onError),
    title: t("copy"),
  });
  const deleteButton = createActionButton({
    className: "message-action message-delete",
    icon: "delete",
    onClick: () => runAction(onDelete, indices, onError),
    title: t("delete"),
  });
  actions.append(copyButton, deleteButton);
  return actions;
};
