import type { LlmSkill } from "../types";

export const actionableExtractionSkill: LlmSkill = {
  name: "extract_actionable_items",
  description: "Extract actionable todos, shopping list items, and calendar events from mixed inputs.",
  promptId: "actionable_extraction",
  responseSchema: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true
        }
      },
      shoppingItems: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true
        }
      },
      events: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true
        }
      }
    },
    required: ["todos", "shoppingItems", "events"]
  }
};
