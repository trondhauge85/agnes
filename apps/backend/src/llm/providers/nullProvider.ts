import type { LlmProvider, LlmRequest, LlmResponse } from "../types";

export class NullLlmProvider implements LlmProvider {
  name = "null";

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const lastMessage = request.messages[request.messages.length - 1];
    return {
      message: {
        role: "assistant",
        content: `LLM provider not configured. Last user input: ${lastMessage?.content ?? ""}`
      },
      usage: {
        inputTokens: request.messages.length * 10,
        outputTokens: 12,
        totalTokens: request.messages.length * 10 + 12
      }
    };
  }
}
