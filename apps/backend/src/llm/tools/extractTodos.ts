import type { LlmTool } from "../types";

const todoPattern = /(\b(todo|task|action|follow up)\b[:\-]?\s*)([^\n]+)/gi;

export const extractTodosTool = (): LlmTool => ({
  definition: {
    name: "extract_todos_from_text",
    description:
      "Extract todos from provided text (e.g. PDF text extraction). Returns JSON array of todo items with title and source snippet.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text content to parse for todos."
        }
      },
      required: ["text"]
    }
  },
  async execute(input: Record<string, unknown>) {
    const text = typeof input.text === "string" ? input.text : "";
    const results: { title: string; snippet: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = todoPattern.exec(text)) !== null) {
      const snippet = match[0].trim();
      const title = match[3]?.trim() ?? snippet;
      results.push({ title, snippet });
    }
    return {
      toolName: "extract_todos_from_text",
      content: JSON.stringify({ todos: results })
    };
  }
});
