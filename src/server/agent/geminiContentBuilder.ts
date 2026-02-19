import type {
  Content as GeminiContent,
  FunctionResponsePart as GeminiFunctionResponsePart,
  Part as GeminiPart,
} from "@google/genai";
import type {
  JsonObject,
  MessageIntermediate,
  ToolCallEntry,
} from "./requestPayloadTypes.ts";
import type { ToolImageInput } from "./toolResultTypes.ts";
import { resolveToolInputObject } from "./requestPayloadMappings.ts";

const resolveGeminiFunctionResponseParts = (
    imageInput: ToolImageInput | undefined,
  ): GeminiFunctionResponsePart[] | undefined => {
    if (imageInput === undefined) {
      return undefined;
    }
    if (imageInput.sourceType === "url") {
      return [
        {
          fileData: {
            fileUri: imageInput.url,
            mimeType: imageInput.mimeType,
          },
        },
      ];
    }
    return [
      {
        inlineData: {
          data: imageInput.data,
          mimeType: imageInput.mimeType,
        },
      },
    ];
  },
  resolveGeminiToolInput = (entry: ToolCallEntry): JsonObject =>
    resolveToolInputObject(entry);

export const buildGeminiContentsFromIntermediates = (
  intermediates: MessageIntermediate[],
): GeminiContent[] => {
  const output: GeminiContent[] = [],
    toolNameByCallId = new Map<string, string>();

  intermediates.forEach((message) => {
    if (message.kind === "conversation") {
      if (message.role !== "user" && message.role !== "assistant") {
        return;
      }

      const parts: GeminiPart[] = [];
      if (message.content.trim()) {
        parts.push({ text: message.content });
      }
      if (message.role === "assistant") {
        message.toolCallEntries.forEach((entry) => {
          toolNameByCallId.set(entry.callId, entry.name);
          const functionCallPart: GeminiPart = {
            functionCall: {
              args: resolveGeminiToolInput(entry),
              id: entry.callId,
              name: entry.name,
            },
          };
          if (entry.thoughtSignature) {
            functionCallPart.thoughtSignature = entry.thoughtSignature;
          }
          parts.push(functionCallPart);
        });
      }
      if (parts.length === 0) {
        return;
      }
      output.push({
        parts,
        role: message.role === "assistant" ? "model" : "user",
      });
      return;
    }

    const toolName = message.name ?? toolNameByCallId.get(message.callId);
    if (!toolName) {
      throw new Error("Gemini 工具响应缺少 name：" + message.callId);
    }

    const functionResponse: NonNullable<GeminiPart["functionResponse"]> = {
      id: message.callId,
      name: toolName,
      response: {
        output: message.content,
      },
    };
    const responseParts = resolveGeminiFunctionResponseParts(
      message.imageInput,
    );
    if (responseParts !== undefined) {
      functionResponse.parts = responseParts;
    }

    output.push({
      parts: [{ functionResponse }],
      role: "user",
    });
  });

  return output;
};
