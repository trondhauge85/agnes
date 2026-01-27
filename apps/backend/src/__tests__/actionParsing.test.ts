import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { LlmProvider } from "../llm";
import { createActionParsingLlmService } from "../llm/actionParsingLlm";
import { parseActionableItems } from "../services/actionParsing";

const buildProvider = (content: string): LlmProvider => ({
  name: "test",
  generate: async () => ({
    message: {
      role: "assistant",
      content
    }
  })
});

describe("parseActionableItems", () => {
  it("normalizes parsed actionable items", async () => {
    const provider = buildProvider(
      JSON.stringify({
        todos: [
          { title: "Pick up laundry", notes: "Before 6pm", confidence: 0.82 }
        ],
        meals: [
          {
            title: "Taco night",
            mealType: "dinner",
            scheduledFor: "2025-02-10T18:00:00.000Z",
            confidence: 0.7
          }
        ],
        events: [
          {
            title: "Dentist",
            start: { dateTime: "2025-03-10T09:00:00.000Z" },
            end: { dateTime: "2025-03-10T10:00:00.000Z" },
            confidence: 0.9
          },
          {
            title: "Football practice",
            start: { dateTime: "2025-03-12T18:30:00.000Z" },
            confidence: 0.88
          }
        ]
      })
    );

    const llmService = createActionParsingLlmService(provider);
    const result = await parseActionableItems(llmService, {
      text: "Reminder: pick up laundry before 6pm. Taco night on Feb 10.",
      timezone: "America/Los_Angeles",
      locale: "en-US"
    });

    assert.equal(result.todos.length, 1);
    assert.equal(result.meals.length, 1);
    assert.equal(result.events.length, 2);
    assert.ok(result.todos[0].id);
    assert.equal(result.meals[0].mealType, "dinner");
    assert.equal(result.events[1].end, undefined);
  });

  it("throws when LLM response is invalid JSON", async () => {
    const provider = buildProvider("not-json");
    const llmService = createActionParsingLlmService(provider);

    await assert.rejects(
      () =>
        parseActionableItems(llmService, {
          text: "Schedule a dentist appointment."
        }),
      { message: "LLM response was not valid JSON." }
    );
  });
});
