import type {
  AnthropicImageBlock,
  AnthropicMessageParam,
  AnthropicTextBlock,
  ChatRequestMessage,
  ChatToolCallForRequest,
  JsonObject,
  MessageIntermediate,
  ResponsesImageOutputItem,
  ResponsesInputItem,
  ResponsesTextOutputItem,
  ToolCallEntry,
  ToolResultIntermediateWithImage,
} from "./requestPayloadTypes.ts";
import { isJsonObject, parseJson } from "../../shared/index.ts";
import type { ToolImageInput } from "./toolResultTypes.ts";

type ConversationMessageIntermediate = Exclude<
  MessageIntermediate,
  { kind: "toolResult" }
>;

type ConversationRoleMappingConfig<TOutput, TRole extends string> = {
  mapByRole: (
    message: ConversationMessageIntermediate,
    role: TRole,
  ) => TOutput[];
  roles: readonly TRole[];
};

const normalizeToolArguments = (entry: ToolCallEntry): string => {
    if (typeof entry.arguments === "string") {
      return entry.arguments;
    }
    try {
      const serialized = JSON.stringify(entry.arguments);
      if (typeof serialized !== "string") {
        throw new Error("工具参数序列化结果无效");
      }
      return serialized;
    } catch (error) {
      console.error("工具参数序列化失败", error);
      throw new Error("工具参数序列化失败");
    }
  },
  toChatToolCallForRequest = (
    entry: ToolCallEntry,
  ): ChatToolCallForRequest => ({
    function: {
      arguments: normalizeToolArguments(entry),
      name: entry.name,
    },
    id: entry.callId,
    type: "function",
  }),
  resolveToolImageDataUrl = (imageInput: ToolImageInput): string =>
    imageInput.sourceType === "url"
      ? imageInput.url
      : "data:" + imageInput.mimeType + ";base64," + imageInput.data,
  buildResponsesToolOutputItems = (
    message: ToolResultIntermediateWithImage,
  ): Array<ResponsesTextOutputItem | ResponsesImageOutputItem> => {
    const outputItems: Array<
      ResponsesTextOutputItem | ResponsesImageOutputItem
    > = [];
    if (message.content.trim().length > 0) {
      outputItems.push({
        text: message.content,
        type: "input_text",
      });
    }
    outputItems.push({
      detail: "auto",
      image_url: resolveToolImageDataUrl(message.imageInput),
      type: "input_image",
    });
    return outputItems;
  },
  buildAnthropicImageBlock = (
    imageInput: ToolImageInput,
  ): AnthropicImageBlock => {
    if (imageInput.sourceType === "url") {
      return {
        source: {
          type: "url",
          url: imageInput.url,
        },
        type: "image",
      };
    }
    return {
      source: {
        data: imageInput.data,
        media_type: imageInput.mimeType,
        type: "base64",
      },
      type: "image",
    };
  },
  resolveToolInputError = (entry: ToolCallEntry): JsonObject => {
    console.error("工具参数必须是对象或对象字符串", {
      arguments: entry.arguments,
      name: entry.name,
    });
    return {};
  },
  toConversationMessage = (
    message: MessageIntermediate,
  ): ConversationMessageIntermediate | null =>
    message.kind === "toolResult" ? null : message,
  mapConversationWithConfig = <TOutput, TRole extends string>(
    message: MessageIntermediate,
    config: ConversationRoleMappingConfig<TOutput, TRole>,
  ): TOutput[] => {
    const conversationMessage = toConversationMessage(message);
    if (conversationMessage === null) {
      return [];
    }
    for (const role of config.roles) {
      if (conversationMessage.role === role) {
        return config.mapByRole(conversationMessage, role);
      }
    }
    return [];
  };

const mapChatAssistantMessage = (
    message: ConversationMessageIntermediate,
  ): ChatRequestMessage[] => {
    const entry: ChatRequestMessage = {
      content: message.content,
      role: "assistant",
    };
    if (message.toolCallEntries.length > 0) {
      entry.tool_calls = message.toolCallEntries.map(toChatToolCallForRequest);
    }
    return entry.content.trim().length > 0 || entry.tool_calls !== undefined
      ? [entry]
      : [];
  },
  mapChatTextMessage = (
    message: ConversationMessageIntermediate,
    role: "user" | "system" | "developer",
  ): ChatRequestMessage[] =>
    message.content.trim().length === 0
      ? []
      : [
          {
            content: message.content,
            role,
          },
        ],
  mapResponsesConversationMessage = (
    message: ConversationMessageIntermediate,
    role: "user" | "assistant",
  ): ResponsesInputItem[] => {
    const output: ResponsesInputItem[] = [];
    if (message.content.length > 0) {
      output.push({
        content: message.content,
        role,
      });
    }
    message.toolCallEntries.forEach((entry) => {
      output.push({
        arguments: normalizeToolArguments(entry),
        call_id: entry.callId,
        name: entry.name,
        type: "function_call",
      });
    });
    return output;
  },
  mapAnthropicConversationMessage = (
    message: ConversationMessageIntermediate,
    role: "user" | "assistant",
  ): AnthropicMessageParam[] => {
    const content: Exclude<AnthropicMessageParam["content"], string> = [];
    if (message.content.trim()) {
      content.push({ text: message.content, type: "text" });
    }

    message.toolCallEntries.forEach((entry) => {
      content.push({
        id: entry.callId,
        input: resolveToolInputObject(entry),
        name: entry.name,
        type: "tool_use",
      });
    });

    if (content.length === 0) {
      return [];
    }

    if (content.length === 1 && content[0].type === "text") {
      return [{ content: content[0].text, role }];
    }

    return [{ content, role }];
  };

const conversationMappingConfigs = {
  anthropic: {
    mapByRole: (
      message: ConversationMessageIntermediate,
      role: "assistant" | "user",
    ): AnthropicMessageParam[] =>
      mapAnthropicConversationMessage(message, role),
    roles: ["assistant", "user"],
  },
  chat: {
    mapByRole: (
      message: ConversationMessageIntermediate,
      role: "assistant" | "user" | "system" | "developer",
    ): ChatRequestMessage[] =>
      role === "assistant"
        ? mapChatAssistantMessage(message)
        : mapChatTextMessage(message, role),
    roles: ["assistant", "user", "system", "developer"],
  },
  responses: {
    mapByRole: (
      message: ConversationMessageIntermediate,
      role: "assistant" | "user",
    ): ResponsesInputItem[] => mapResponsesConversationMessage(message, role),
    roles: ["assistant", "user"],
  },
} satisfies {
  anthropic: ConversationRoleMappingConfig<
    AnthropicMessageParam,
    "assistant" | "user"
  >;
  chat: ConversationRoleMappingConfig<
    ChatRequestMessage,
    "assistant" | "user" | "system" | "developer"
  >;
  responses: ConversationRoleMappingConfig<
    ResponsesInputItem,
    "assistant" | "user"
  >;
};

export const resolveToolInputObject = (entry: ToolCallEntry): JsonObject => {
  if (typeof entry.arguments === "string") {
    try {
      const parsed = parseJson(entry.arguments);
      if (isJsonObject(parsed)) {
        return { ...parsed };
      }
      return resolveToolInputError(entry);
    } catch (error) {
      console.error("Failed to parse tool arguments", error);
      return {};
    }
  }
  if (isJsonObject(entry.arguments)) {
    return { ...entry.arguments };
  }
  return resolveToolInputError(entry);
};

export const mapMessageIntermediateToChat = (
  message: MessageIntermediate,
): ChatRequestMessage[] => {
  if (message.kind === "toolResult") {
    return [
      {
        content: message.content,
        role: "tool",
        tool_call_id: message.callId,
      },
    ];
  }

  return mapConversationWithConfig(message, conversationMappingConfigs.chat);
};

export const mapMessageIntermediateToResponses = (
  message: MessageIntermediate,
): ResponsesInputItem[] => {
  if (message.kind === "toolResult") {
    const outputValue =
      message.imageInput === undefined
        ? message.content
        : buildResponsesToolOutputItems(message);
    return [
      {
        call_id: message.callId,
        output: outputValue,
        type: "function_call_output",
      },
    ];
  }

  return mapConversationWithConfig(
    message,
    conversationMappingConfigs.responses,
  );
};

export const mapMessageIntermediateToAnthropic = (
  message: MessageIntermediate,
): AnthropicMessageParam[] => {
  if (message.kind === "toolResult") {
    const toolResultContentBlocks: Array<
      AnthropicTextBlock | AnthropicImageBlock
    > = [];
    if (message.content.trim()) {
      toolResultContentBlocks.push({
        text: message.content,
        type: "text",
      });
    }
    if (message.imageInput !== undefined) {
      toolResultContentBlocks.push(
        buildAnthropicImageBlock(message.imageInput),
      );
    }
    const toolResultContent =
      toolResultContentBlocks.length === 0
        ? message.content
        : toolResultContentBlocks;
    return [
      {
        content: [
          {
            content: toolResultContent,
            tool_use_id: message.callId,
            type: "tool_result",
          },
        ],
        role: "user",
      },
    ];
  }

  return mapConversationWithConfig(
    message,
    conversationMappingConfigs.anthropic,
  );
};

export const mergeAnthropicMessages = (
  messages: AnthropicMessageParam[],
): AnthropicMessageParam[] => {
  const merged: AnthropicMessageParam[] = [];
  messages.forEach((message) => {
    if (merged.length > 0) {
      const last = merged[merged.length - 1];
      if (last.role === message.role) {
        if (Array.isArray(last.content) && Array.isArray(message.content)) {
          last.content.push(...message.content);
        } else if (Array.isArray(last.content)) {
          if (typeof message.content === "string") {
            last.content.push({ text: message.content, type: "text" });
          }
        } else if (Array.isArray(message.content)) {
          last.content = [
            { text: last.content, type: "text" },
            ...message.content,
          ];
        } else {
          last.content = last.content + "\n\n" + message.content;
        }
        return;
      }
    }
    merged.push(message);
  });
  return merged;
};
