import type { LlmSkill } from "../types";

export const todoExtractionSkill: LlmSkill = {
  name: "extract_todos",
  description:
    "Extract todo items from provided text (e.g. PDF text extraction) and return structured JSON.",
  promptId: "todo_extraction",
  toolNames: ["extract_todos_from_text"],
  responseSchema: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            snippet: { type: "string" },
            confidence: { type: "number" }
          },
          required: ["title", "snippet", "confidence"]
        }
      }
    },
    required: ["todos"]
  }
};
