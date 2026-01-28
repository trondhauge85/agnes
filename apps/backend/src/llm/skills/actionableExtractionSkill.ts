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
          properties: {
            title: { type: "string" },
            notes: { type: "string" },
            recurrence: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
            confidenceReasons: { type: "array", items: { type: "string" } },
            source: { type: "string" }
          }
        }
      },
      shoppingItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            notes: { type: "string" },
            confidence: { type: "number" },
            confidenceReasons: { type: "array", items: { type: "string" } },
            source: { type: "string" }
          }
        }
      },
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            start: {
              type: "object",
              properties: {
                dateTime: { type: "string" },
                timeZone: { type: "string" }
              }
            },
            end: {
              type: "object",
              properties: {
                dateTime: { type: "string" },
                timeZone: { type: "string" }
              }
            },
            location: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                meetingUrl: { type: "string" }
              }
            },
            recurrence: { type: "array", items: { type: "string" } },
            confidence: { type: "number" },
            confidenceReasons: { type: "array", items: { type: "string" } },
            source: { type: "string" },
            notes: { type: "string" }
          }
        }
      }
    },
    required: ["todos", "shoppingItems", "events"]
  }
};
