import type { LlmSkill } from "../types";

export const actionableExtractionSkill: LlmSkill = {
  name: "extract_actionable_items",
  description: "Extract actionable todos, meals, and calendar events from mixed inputs.",
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
            confidence: { type: "number" },
            source: { type: "string" }
          },
          required: ["title", "confidence"]
        }
      },
      meals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            notes: { type: "string" },
            mealType: { type: "string" },
            scheduledFor: { type: "string" },
            servings: { type: "number" },
            recipeUrl: { type: "string" },
            confidence: { type: "number" },
            source: { type: "string" }
          },
          required: ["title", "confidence"]
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
            confidence: { type: "number" },
            source: { type: "string" }
          },
          required: ["title", "confidence"]
        }
      }
    },
    required: ["todos", "meals", "events"]
  }
};
