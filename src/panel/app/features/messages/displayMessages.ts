import { combineMessageContents } from "../../../utils/index.ts";

export type MessageEntry = {
  role?: unknown;
  content?: unknown;
  hidden?: boolean;
  pending?: boolean;
  status?: unknown;
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
};

const combineMessageContentsSafe = combineMessageContents as (
  segments: string[],
) => string;

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

export const buildDisplayMessages = (
  messages: MessageList,
): DisplayMessage[] => {
  if (!Array.isArray(messages)) {
    throw new Error("messages 必须是数组");
  }
  const entries: DisplayMessage[] = [];
  let assistantGroup: AssistantGroup | null = null;
  let hasToolBridge = false;
  const flushAssistantGroup = (): void => {
      if (!assistantGroup) {
        return;
      }
      const content = combineMessageContentsSafe(assistantGroup.contents);
      if (content || assistantGroup.hasPending) {
        entries.push({
          role: "assistant",
          content,
          indices: assistantGroup.indices,
          status: assistantGroup.status,
        });
      }
      assistantGroup = null;
      hasToolBridge = false;
    },
    startAssistantGroup = (
      content: string,
      index: number,
      pending: boolean,
      status: string,
    ): void => {
      assistantGroup = {
        contents: [content],
        indices: [index],
        hasPending: pending,
        status,
      };
    };
  messages.forEach((msg, index) => {
    if (!msg || typeof msg !== "object") {
      throw new Error("消息格式无效");
    }
    if (msg.hidden) {
      if (msg.role === "tool" && assistantGroup) {
        hasToolBridge = true;
      }
      return;
    }
    const role = resolveMessageRole(msg.role);
    const content = resolveMessageContent(msg.content, role);
    if (role === "assistant") {
      const isPending = msg.pending === true;
      const status = resolveMessageStatus(msg.status, role);
      if (!assistantGroup) {
        startAssistantGroup(content, index, isPending, status);
        return;
      }
      if (hasToolBridge) {
        assistantGroup.contents.push(content);
        assistantGroup.indices.push(index);
        assistantGroup.hasPending = assistantGroup.hasPending || isPending;
        assistantGroup.status = status;
        hasToolBridge = false;
        return;
      }
      flushAssistantGroup();
      startAssistantGroup(content, index, isPending, status);
      return;
    }
    flushAssistantGroup();
    entries.push({ role, content, indices: [index] });
  });
  flushAssistantGroup();
  return entries;
};
