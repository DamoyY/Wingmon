import { combineMessageContents } from "../../../utils/index.ts";

export type MessageEntry = {
  role?: unknown;
  content?: unknown;
  hidden?: boolean;
  pending?: boolean;
  status?: unknown;
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
  status: string;
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

const resolveMessageStatus = (status: unknown, role: string): string => {
  if (status === null || status === undefined) {
    return "";
  }
  if (typeof status !== "string") {
    const label = role ? `：${role}` : "";
    throw new Error(`状态内容格式无效${label}`);
  }
  return status;
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
): DisplayMessage[] => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
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
          role: "assistant",
          content,
          indices: assistantGroup.indices,
          status: assistantGroup.status,
        });
      }
      assistantGroup = null;
    },
    startAssistantGroup = (
      content: string,
      index: number,
      pending: boolean,
      status: string,
      groupId: string,
    ): void => {
      assistantGroup = {
        contents: [content],
        indices: [index],
        hasPending: pending,
        status,
        groupId,
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
      const status = resolveMessageStatus(msg.status, role);
      const groupId = resolveMessageGroupId(msg.groupId, role) || String(index);
      if (!assistantGroup) {
        startAssistantGroup(content, index, isPending, status, groupId);
        return;
      }
      if (assistantGroup.groupId === groupId) {
        assistantGroup.contents.push(content);
        assistantGroup.indices.push(index);
        assistantGroup.hasPending = assistantGroup.hasPending || isPending;
        assistantGroup.status = status;
        return;
      }
      flushAssistantGroup();
      startAssistantGroup(content, index, isPending, status, groupId);
      return;
    }
    flushAssistantGroup();
    entries.push({ role, content, indices: [index] });
  });
  flushAssistantGroup();
  return entries;
};
