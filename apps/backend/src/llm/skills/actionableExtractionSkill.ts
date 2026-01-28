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
          type: "object"
        }
      },
      shoppingItems: {
        type: "array",
        items: {
          type: "object"
        }
      },
      events: {
        type: "array",
        items: {
          type: "object"
        }
      }
    },
    required: ["todos", "shoppingItems", "events"]
  }
};
