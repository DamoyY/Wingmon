import type { ToolCall, ToolCallArguments } from "./definitions.ts";
import type { JsonValue } from "../../shared/index.ts";
import type { MessageRecord } from "../../shared/state/panelStateContext.ts";
import type { ToolImageInput } from "./toolResultTypes.ts";

export type JsonObject = Record<string, JsonValue>;
export type RawToolCall = NonNullable<MessageRecord["tool_calls"]>[number];
export type MessageFieldValue = RawToolCall[string];

export type NormalizedMessage = {
  content: string;
  name?: string;
  role: string;
  tool_calls: ToolCall[];
  tool_call_id?: string;
  toolContext?: MessageFieldValue;
};

export type ToolCallEntry = {
  arguments: ToolCallArguments;
  callId: string;
  name: string;
};

export type ChatToolCallForRequest = {
  function: {
    arguments: string;
    name: string;
  };
  id: string;
  type: "function";
};

export type ChatTextContentPart = {
  text: string;
  type: "text";
};

type ChatUserContent = string | ChatTextContentPart[];

export type ChatRequestMessage =
  | {
      content: string;
      role: "system" | "developer";
    }
  | {
      content: string;
      role: "assistant";
      tool_calls?: ChatToolCallForRequest[];
    }
  | {
      content: string;
      role: "user";
    }
  | {
      content: ChatUserContent;
      role: "tool";
      tool_call_id: string;
    };

export type ResponsesTextOutputItem = {
  text: string;
  type: "input_text";
};

export type ResponsesImageOutputItem = {
  detail: "auto";
  image_url: string;
  type: "input_image";
};

export type ResponsesInputItem =
  | {
      content: string;
      role: "user" | "assistant";
    }
  | {
      arguments: string;
      call_id: string;
      name: string;
      type: "function_call";
    }
  | {
      call_id: string;
      output:
        | string
        | Array<ResponsesTextOutputItem | ResponsesImageOutputItem>;
      type: "function_call_output";
    };

export type AnthropicTextBlock = { type: "text"; text: string };

export type AnthropicImageBlock =
  | {
      source: { type: "url"; url: string };
      type: "image";
    }
  | {
      source: {
        data: string;
        media_type: "image/png" | "image/jpeg" | "image/webp";
        type: "base64";
      };
      type: "image";
    };

export type AnthropicToolUseBlock = {
  id: string;
  input: JsonObject;
  name: string;
  type: "tool_use";
};

export type AnthropicToolResultBlock = {
  content: string | Array<AnthropicTextBlock | AnthropicImageBlock>;
  tool_use_id: string;
  type: "tool_result";
};

export type AnthropicMessageParam = {
  content:
    | string
    | Array<
        AnthropicTextBlock | AnthropicToolUseBlock | AnthropicToolResultBlock
      >;
  role: "user" | "assistant";
};

export type ContextPlanItem = {
  includeToolCalls: boolean;
  index: number;
};

export type ConversationIntermediate = {
  content: string;
  kind: "conversation";
  role: string;
  toolCallEntries: ToolCallEntry[];
};

export type ToolResultIntermediate = {
  callId: string;
  content: string;
  imageInput?: ToolImageInput;
  kind: "toolResult";
  name?: string;
};

export type ToolResultIntermediateWithImage = ToolResultIntermediate & {
  imageInput: ToolImageInput;
};

export type MessageIntermediate =
  | ConversationIntermediate
  | ToolResultIntermediate;
