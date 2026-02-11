import { combineMessageContents } from "../../../lib/utils/index.ts";

export type MessageEntry = {
  role?: unknown;
  content?: unknown;
  hidden?: boolean;
  pending?: boolean;
  groupId?: unknown;
};

export type MessageList = Array<MessageEntry | null | undefined>;

export type DisplayMessage = {
  role: string;
  content: string;
  indices: number[];
  status?: string;
};

type AssistantGroup = {
  contents: string[];
  indices: number[];
  hasPending: boolean;
  groupId: string;
};

const resolveMessageRole = (role: unknown): string => {
  if (role === null || role === undefined) {
    return "";
  }
  if (typeof role !== "string") {
    throw new Error("消息角色格式无效");
  }
  return role;
};

const resolveMessageContent = (content: unknown, role: string): string => {
  if (content === null || content === undefined) {
    return "";
  }
  if (typeof content !== "string") {
    const label = role ? `：${role}` : "";
    throw new Error(`消息内容格式无效${label}`);
  }
  return content;
};

const resolveMessageGroupId = (groupId: unknown, role: string): string => {
  if (groupId === null || groupId === undefined) {
    return "";
  }
  if (typeof groupId !== "string") {
    const label = role ? `：${role}` : "";
    throw new Error(`分组标识格式无效${label}`);
  }
  return groupId;
};

export const buildDisplayMessages = (
  messages: MessageList,
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
    ): void => {
      assistantGroup = {
        contents: [content],
        groupId,
        hasPending: pending,
        indices: [index],
      };
    };
  messages.forEach((msg, index) => {
    if (!msg || typeof msg !== "object") {
      throw new Error("消息格式无效");
    }
    if (msg.hidden) {
      return;
    }
    const role = resolveMessageRole(msg.role);
    const content = resolveMessageContent(msg.content, role);
    if (role === "assistant") {
      const isPending = msg.pending === true;
      const groupId = resolveMessageGroupId(msg.groupId, role) || String(index);
      if (!assistantGroup) {
        startAssistantGroup(content, index, isPending, groupId);
        return;
      }
      if (assistantGroup.groupId === groupId) {
        assistantGroup.contents.push(content);
        assistantGroup.hasPending = assistantGroup.hasPending || isPending;
        assistantGroup.indices.push(index);
        return;
      }
      flushAssistantGroup();
      startAssistantGroup(content, index, isPending, groupId);
      return;
    }
    flushAssistantGroup();
    entries.push({ content, indices: [index], role });
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
