import type { PromptTemplate } from "../types";

export const todoExtractionPrompt: PromptTemplate = {
  id: "todo_extraction",
  description: "Extract todo items from provided text and return JSON.",
  render: ({ sourceText }) =>
    [
      "You are an assistant that extracts actionable todo items from text.",
      "Return a JSON object with a 'todos' array.",
      "Each todo should include: title, snippet, confidence (0-1).",
      "Text:",
      sourceText
    ].join("\n")
};
