import type { PromptTemplate } from "../types";

export const actionableExtractionPrompt: PromptTemplate = {
  id: "actionable_extraction",
  description: "Extract actionable todos, meals, and calendar events from mixed inputs.",
  render: ({ sourceText, timezone, locale }) =>
    [
      "You are an assistant that extracts actionable items from user input.",
      "The input may include plain text and attachment data (images or PDFs encoded as data URLs).",
      "Use the user's locale and timezone when interpreting dates and times.",
      `Locale: ${locale || "en-US"}`,
      `Timezone: ${timezone || "UTC"}`,
      "Return a JSON object with keys: todos, meals, events.",
      "- todos: array of { title, notes?, confidence, source? }",
      "- meals: array of { title, notes?, mealType?, scheduledFor?, servings?, recipeUrl?, confidence, source? }",
      "- events: array of { title, description?, start?, end?, location?, confidence, source? }",
      "Only include items that are clearly actionable.",
      "For events, include start and end in ISO 8601 dateTime when both are explicit; otherwise omit the end date.",
      "For scheduledFor, return an ISO 8601 timestamp if a date/time is explicit.",
      "Confidence must be a number between 0 and 1.",
      "Source should be a short snippet that supports the item.",
      "Input:",
      sourceText
    ].join("\n")
};
