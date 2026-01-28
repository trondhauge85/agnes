import type { LlmProvider, LlmRequest, LlmResponse, LlmUsage } from "../types";

export type GeminiProviderConfig = {
  apiKey: string;
  model?: string;
  apiBaseUrl?: string;
};

type GeminiInlineData = {
  mimeType: string;
  data: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiRequest = {
  contents: GeminiContent[];
  systemInstruction?: {
    role: "system";
    parts: GeminiPart[];
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DATA_URL_REGEX = /data:([^;]+);base64,([A-Za-z0-9+/=]+)/g;

const extractInlineParts = (content: string): { text: string; inlineParts: GeminiPart[] } => {
  const inlineParts: GeminiPart[] = [];
  const text = content.replace(DATA_URL_REGEX, (_match, mimeType, data) => {
    inlineParts.push({ inlineData: { mimeType, data } });
    return `data:${mimeType};base64,[omitted]`;
  });

  return { text, inlineParts };
};

const buildParts = (text: string, inlineParts: GeminiPart[]): GeminiPart[] => {
  const parts: GeminiPart[] = [];
  if (text.trim().length > 0) {
    parts.push({ text });
  }
  return parts.concat(inlineParts);
};

const buildUsage = (payload?: GeminiResponse["usageMetadata"]): LlmUsage | undefined => {
  if (!payload) {
    return undefined;
  }
  return {
    inputTokens: payload.promptTokenCount,
    outputTokens: payload.candidatesTokenCount,
    totalTokens: payload.totalTokenCount
  };
};

const getResponseText = (response: GeminiResponse): string => {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
};

export const createGeminiProvider = (config: GeminiProviderConfig): LlmProvider => {
  const apiKey = config.apiKey;
  const model = config.model ?? DEFAULT_MODEL;
  const apiBaseUrl = config.apiBaseUrl ?? DEFAULT_BASE_URL;

  return {
    name: "gemini",
    async generate(request: LlmRequest): Promise<LlmResponse> {
      const systemMessages = request.messages.filter((message) => message.role === "system");
      const otherMessages = request.messages.filter((message) => message.role !== "system");

      const systemText = systemMessages.map((message) => message.content).join("\n\n");
      const systemExtraction = extractInlineParts(systemText);

      const contents: GeminiContent[] = otherMessages
        .map((message) => {
          const { text, inlineParts } = extractInlineParts(message.content);
          const role = message.role === "assistant" ? "model" : "user";
          return {
            role,
            parts: buildParts(text, inlineParts)
          };
        })
        .filter((content) => content.parts.length > 0);

      if (systemExtraction.inlineParts.length > 0) {
        if (contents.length === 0) {
          contents.push({ role: "user", parts: systemExtraction.inlineParts });
        } else {
          contents[0].parts = contents[0].parts.concat(systemExtraction.inlineParts);
        }
      }

      if (contents.length === 0) {
        contents.push({ role: "user", parts: [{ text: "OK" }] });
      }

      const payload: GeminiRequest = {
        contents,
        systemInstruction: systemExtraction.text.trim().length
          ? { role: "system", parts: [{ text: systemExtraction.text }] }
          : undefined,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          responseMimeType: request.responseSchema ? "application/json" : undefined,
          responseSchema: request.responseSchema
        }
      };

      const response = await fetch(
        `${apiBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as GeminiResponse;

      return {
        message: {
          role: "assistant",
          content: getResponseText(data)
        },
        usage: buildUsage(data.usageMetadata)
      };
    }
  };
};
