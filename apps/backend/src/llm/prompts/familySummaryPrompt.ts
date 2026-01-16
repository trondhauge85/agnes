import type { PromptTemplate } from "../types";

export const familySummaryPrompt: PromptTemplate = {
  id: "family_summary_sms",
  description: "Generate a short, informal SMS summary for a family.",
  render: ({
    familyName,
    periodLabel,
    calendarItems,
    todoItems,
    mealItems,
    shoppingItems
  }) =>
    [
      "You are a friendly family assistant.",
      `Create a short, informal SMS summary for ${familyName} covering ${periodLabel}.`,
      "Use emojis at the start of each line item.",
      "Keep it informative, warm, and concise (under 8 lines).",
      "Return plain text only (no markdown, no JSON).",
      "If a section is empty, skip it or briefly mention there's nothing new.",
      "",
      "Calendar events:",
      calendarItems || "None",
      "",
      "Todos:",
      todoItems || "None",
      "",
      "Meals:",
      mealItems || "None",
      "",
      "Shopping list:",
      shoppingItems || "None"
    ].join("\n")
};
