import type {
  ChatFallbackRequestBody,
  ChatRequestBody,
  GeminiFallbackRequestBody,
  GeminiRequestBody,
  RequestBodyBuilders,
  ResponsesFallbackRequestBody,
  ResponsesRequestBody,
} from "./apiContracts.ts";
import {
  FunctionCallingConfigMode,
  type Tool as GeminiTool,
} from "@google/genai";
import {
  buildChatMessages,
  buildGeminiContents,
  buildMessagesInput,
  buildResponsesInput,
} from "../agent/requestMessageBuilders.ts";
import type Anthropic from "@anthropic-ai/sdk";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { MessageRecord } from "../../shared/state/panelStateContext.ts";
import type { Tool as ResponsesTool } from "openai/resources/responses/responses";
import type { Settings } from "../services/index.ts";
import type { ToolDefinition } from "../agent/definitions.ts";
import { applyBodyOverrideRules } from "../../shared/index.ts";

type MessagesRequestBody = Anthropic.MessageCreateParamsStreaming;
type MessagesFallbackRequestBody = Anthropic.MessageCreateParamsNonStreaming;

type RequestBodyContext = {
  model: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  messages: MessageRecord[];
};

type FlatRequestBodyTemplate<TTool> = {
  buildInputFields: (
    systemPrompt: string,
    messages: MessageRecord[],
  ) => Record<string, unknown>;
  mapTool: (tool: ToolDefinition) => TTool;
  staticFields?: Record<string, unknown>;
  systemPromptFieldName?: "instructions" | "system";
};

const applySettingsRequestBodyOverrides = <
    TBody extends Record<string, unknown>,
  >(
    settings: Settings,
    body: TBody,
  ): TBody => {
    if (settings.requestBodyOverrides.trim() === "") {
      return body;
    }
    return applyBodyOverrideRules(body, settings.requestBodyOverrides);
  },
  toToolSchema = (tool: ToolDefinition) =>
    "function" in tool ? tool.function : tool,
  toChatTool = (tool: ToolDefinition): ChatCompletionTool => {
    const toolSchema = toToolSchema(tool);
    return {
      function: {
        description: toolSchema.description,
        name: toolSchema.name,
        parameters: toolSchema.parameters as Record<string, unknown>,
        strict: toolSchema.strict,
      },
      type: "function",
    };
  },
  toResponsesTool = (tool: ToolDefinition): ResponsesTool => {
    const toolSchema = toToolSchema(tool);
    return {
      description: toolSchema.description,
      name: toolSchema.name,
      parameters: toolSchema.parameters as Record<string, unknown>,
      strict: toolSchema.strict,
      type: "function",
    };
  },
  toAnthropicTool = (tool: ToolDefinition): Anthropic.Tool => {
    const toolSchema = toToolSchema(tool);
    return {
      description: toolSchema.description,
      input_schema: toolSchema.parameters as Anthropic.Tool.InputSchema,
      name: toolSchema.name,
    };
  },
  toGeminiTool = (tool: ToolDefinition): GeminiTool => {
    const toolSchema = toToolSchema(tool);
    return {
      functionDeclarations: [
        {
          description: toolSchema.description,
          name: toolSchema.name,
          parametersJsonSchema: toolSchema.parameters as Record<
            string,
            unknown
          >,
        },
      ],
    };
  };

const createRequestBodyBuilders = <
    TStreamBody extends Record<string, unknown>,
    TNonStreamBody extends Record<string, unknown>,
  >({
    buildStreamBody,
    buildNonStreamBody,
  }: {
    buildStreamBody: (context: RequestBodyContext) => TStreamBody;
    buildNonStreamBody: (context: RequestBodyContext) => TNonStreamBody;
  }): RequestBodyBuilders<TStreamBody, TNonStreamBody> => ({
    buildNonStreamRequestBody: (settings, systemPrompt, tools, messages) =>
      applySettingsRequestBodyOverrides(
        settings,
        buildNonStreamBody({
          messages,
          model: settings.model,
          systemPrompt,
          tools,
        }),
      ),
    buildStreamRequestBody: (settings, systemPrompt, tools, messages) =>
      applySettingsRequestBodyOverrides(
        settings,
        buildStreamBody({
          messages,
          model: settings.model,
          systemPrompt,
          tools,
        }),
      ),
  }),
  createUniformRequestBodyBuilders = <
    TStreamBody extends Record<string, unknown>,
    TNonStreamBody extends Record<string, unknown>,
  >(
    buildBody: (context: RequestBodyContext) => TStreamBody & TNonStreamBody,
  ): RequestBodyBuilders<TStreamBody, TNonStreamBody> =>
    createRequestBodyBuilders({
      buildNonStreamBody: buildBody,
      buildStreamBody: buildBody,
    }),
  createStreamToggleRequestBodyBuilders = <
    TStreamBody extends Record<string, unknown> & { stream: true },
    TNonStreamBody extends Record<string, unknown> & { stream: false },
  >(
    buildBaseBody: (
      context: RequestBodyContext,
    ) => Omit<TStreamBody, "stream"> & Omit<TNonStreamBody, "stream">,
  ): RequestBodyBuilders<TStreamBody, TNonStreamBody> =>
    createRequestBodyBuilders({
      buildNonStreamBody: (context) => ({
        ...buildBaseBody(context),
        stream: false,
      }),
      buildStreamBody: (context) => ({
        ...buildBaseBody(context),
        stream: true,
      }),
    }),
  createFlatRequestBodyBuilders = <
    TStreamBody extends Record<string, unknown> & { stream: true },
    TNonStreamBody extends Record<string, unknown> & { stream: false },
    TTool,
  >({
    buildInputFields,
    mapTool,
    staticFields,
    systemPromptFieldName,
  }: FlatRequestBodyTemplate<TTool>): RequestBodyBuilders<
    TStreamBody,
    TNonStreamBody
  > =>
    createStreamToggleRequestBodyBuilders((context) => ({
      ...buildInputFields(context.systemPrompt, context.messages),
      ...(staticFields ?? {}),
      ...(systemPromptFieldName && context.systemPrompt
        ? { [systemPromptFieldName]: context.systemPrompt }
        : {}),
      model: context.model,
      tools: context.tools.map(mapTool),
    }));

const chatRequestBodyBuilders = createFlatRequestBodyBuilders<
    ChatRequestBody,
    ChatFallbackRequestBody,
    ChatCompletionTool
  >({
    buildInputFields: (systemPrompt, messages) => ({
      messages: buildChatMessages(systemPrompt, messages),
    }),
    mapTool: toChatTool,
  }),
  messagesRequestBodyBuilders = createFlatRequestBodyBuilders<
    MessagesRequestBody,
    MessagesFallbackRequestBody,
    Anthropic.Tool
  >({
    buildInputFields: (_systemPrompt, messages) => ({
      messages: buildMessagesInput(messages),
    }),
    mapTool: toAnthropicTool,
    staticFields: { max_tokens: 64000 },
    systemPromptFieldName: "system",
  }),
  responsesRequestBodyBuilders = createFlatRequestBodyBuilders<
    ResponsesRequestBody,
    ResponsesFallbackRequestBody,
    ResponsesTool
  >({
    buildInputFields: (_systemPrompt, messages) => ({
      input: buildResponsesInput(messages),
    }),
    mapTool: toResponsesTool,
    systemPromptFieldName: "instructions",
  });

export const {
  buildNonStreamRequestBody: buildChatNonStreamRequestBody,
  buildStreamRequestBody: buildChatStreamRequestBody,
} = chatRequestBodyBuilders;

export const {
  buildNonStreamRequestBody: buildMessagesNonStreamRequestBody,
  buildStreamRequestBody: buildMessagesStreamRequestBody,
} = messagesRequestBodyBuilders;

export const {
  buildNonStreamRequestBody: buildResponsesNonStreamRequestBody,
  buildStreamRequestBody: buildResponsesStreamRequestBody,
} = responsesRequestBodyBuilders;

const buildGeminiRequestConfig = ({
  systemPrompt,
  tools,
}: {
  systemPrompt: string;
  tools: ToolDefinition[];
}): GeminiRequestBody["config"] => ({
  toolConfig: {
    functionCallingConfig: {
      mode: FunctionCallingConfigMode.AUTO,
    },
  },
  tools: tools.map(toGeminiTool),
  ...(systemPrompt
    ? {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      }
    : {}),
});

const geminiRequestBodyBuilders = createUniformRequestBodyBuilders<
  GeminiRequestBody,
  GeminiFallbackRequestBody
>(({ model, systemPrompt, tools, messages }) => ({
  config: buildGeminiRequestConfig({ systemPrompt, tools }),
  contents: buildGeminiContents(messages),
  model,
}));

export const {
  buildNonStreamRequestBody: buildGeminiNonStreamRequestBody,
  buildStreamRequestBody: buildGeminiStreamRequestBody,
} = geminiRequestBodyBuilders;
