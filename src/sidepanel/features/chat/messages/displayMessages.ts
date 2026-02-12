import type { MessageRecord } from "../../../core/store/index.ts";
import { combineMessageContents } from "../../../lib/utils/index.ts";

type NormalizedMessage = {
  id: string;
  role: string;
  content: string;
  pending: boolean;
  hidden: boolean;
  groupId: string;
};

type AssistantGroup = {
  contents: string[];
  indices: number[];
  hasPending: boolean;
  groupId: string;
  renderKey: string;
};

export type DisplayMessage = {
  renderKey: string;
  role: string;
  content: string;
  indices: number[];
  status?: string;
};

const normalizeMessage = (message: MessageRecord): NormalizedMessage => {
  return {
    content: message.content,
    groupId: message.groupId,
    hidden: message.hidden,
    id: message.id,
    pending: message.pending,
    role: message.role,
  };
};

export const buildDisplayMessages = (
  messages: readonly MessageRecord[],
  activeStatus: string | null = null,
): DisplayMessage[] => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  if (
    activeStatus !== null &&
    (typeof activeStatus !== "string" || activeStatus.length === 0)
  ) {
    throw new Error("活动状态格式无效");
  }
  const entries: DisplayMessage[] = [];
  let assistantGroup: AssistantGroup | null = null;
  const flushAssistantGroup = (): void => {
      if (!assistantGroup) {
        return;
      }
      const content = combineMessageContents(assistantGroup.contents);
      if (content || assistantGroup.hasPending) {
        entries.push({
          content,
          indices: assistantGroup.indices,
          renderKey: assistantGroup.renderKey,
          role: "assistant",
        });
      }
      assistantGroup = null;
    },
    startAssistantGroup = (
      content: string,
      index: number,
      pending: boolean,
      groupId: string,
      renderKey: string,
    ): void => {
      assistantGroup = {
        contents: [content],
        groupId,
        hasPending: pending,
        indices: [index],
        renderKey,
      };
    };
  messages.forEach((message: MessageRecord, index: number) => {
    const normalized = normalizeMessage(message);
    if (normalized.hidden) {
      return;
    }
    if (normalized.role === "assistant") {
      const groupId = normalized.groupId || normalized.id;
      const renderKey = `assistant:${groupId}`;
      if (!assistantGroup) {
        startAssistantGroup(
          normalized.content,
          index,
          normalized.pending,
          groupId,
          renderKey,
        );
        return;
      }
      if (assistantGroup.groupId === groupId) {
        assistantGroup.contents.push(normalized.content);
        assistantGroup.hasPending =
          assistantGroup.hasPending || normalized.pending;
        assistantGroup.indices.push(index);
        return;
      }
      flushAssistantGroup();
      startAssistantGroup(
        normalized.content,
        index,
        normalized.pending,
        groupId,
        renderKey,
      );
      return;
    }
    flushAssistantGroup();
    const renderRole = normalized.role.trim() || "message";
    entries.push({
      content: normalized.content,
      indices: [index],
      renderKey: `${renderRole}:${normalized.id}`,
      role: normalized.role,
    });
  });
  flushAssistantGroup();
  if (activeStatus) {
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (entry.role !== "assistant") {
        continue;
      }
      entries[i] = { ...entry, status: activeStatus };
      break;
    }
  }
  return entries;
};
