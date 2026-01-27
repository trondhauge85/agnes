import type { LlmService } from "../llm";
import { normalizeString } from "../utils/strings";

export type ActionParseFile = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type ActionParseInput = {
  text?: string;
  files?: ActionParseFile[];
  timezone?: string;
  locale?: string;
};

export type ActionParseTodo = {
  id: string;
  title: string;
  notes?: string;
  confidence: number;
  source?: string;
};

export type ActionParseMeal = {
  id: string;
  title: string;
  notes?: string;
  mealType?: string;
  scheduledFor?: string;
  servings?: number;
  recipeUrl?: string;
  confidence: number;
  source?: string;
};

export type ActionParseEvent = {
  id: string;
  title: string;
  description?: string;
  start?: {
    dateTime: string;
    timeZone?: string;
  };
  end?: {
    dateTime: string;
    timeZone?: string;
  };
  location?: {
    name?: string;
    address?: string;
    meetingUrl?: string;
  };
  confidence: number;
  source?: string;
};

export type ActionParseResult = {
  todos: ActionParseTodo[];
  meals: ActionParseMeal[];
  events: ActionParseEvent[];
};

const DEFAULT_EVENT_DURATION_MINUTES = 60;

const normalizeConfidence = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(1, Math.max(0, value));
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(typeof value === "string" ? value : "");
  return normalized || undefined;
};

const normalizeDateTime = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
};

const addMinutes = (value: string, minutes: number): string | undefined => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  parsed.setMinutes(parsed.getMinutes() + minutes);
  return parsed.toISOString();
};

const normalizeSourceText = (input: ActionParseInput): string => {
  const lines: string[] = [];
  const text = normalizeString(input.text ?? "");
  if (text) {
    lines.push("User text:");
    lines.push(text);
  }

  if (input.files && input.files.length > 0) {
    input.files.forEach((file, index) => {
      lines.push("");
      lines.push(`Attachment ${index + 1}:`);
      lines.push(`Name: ${file.name}`);
      lines.push(`MimeType: ${file.mimeType}`);
      lines.push(`DataUrl: ${file.dataUrl}`);
    });
  }

  return lines.join("\n");
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const parseJsonResponse = (content: string): Record<string, unknown> => {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error("LLM response was not valid JSON.");
  }
};

export const parseActionableItems = async (
  llmService: LlmService,
  input: ActionParseInput
): Promise<ActionParseResult> => {
  const sourceText = normalizeSourceText(input);
  const task = await llmService.runTask({
    skillName: "extract_actionable_items",
    input: {
      sourceText,
      timezone: input.timezone ?? "UTC",
      locale: input.locale ?? "en-US",
      userMessage: "Extract actionable todos, meals, and events."
    }
  });

  const responseContent = task.response.message.content ?? "";
  const parsed = parseJsonResponse(responseContent);

  const todos = Array.isArray(parsed.todos) ? parsed.todos : [];
  const meals = Array.isArray(parsed.meals) ? parsed.meals : [];
  const events = Array.isArray(parsed.events) ? parsed.events : [];

  return {
    todos: todos
      .map((item) => {
        const record = asRecord(item);
        const title = normalizeOptionalString(record.title) ?? "";
        const confidence = normalizeConfidence(record.confidence);
        if (!title || confidence === null) {
          return null;
        }

        return {
          id: crypto.randomUUID(),
          title,
          notes: normalizeOptionalString(record.notes),
          confidence,
          source: normalizeOptionalString(record.source)
        } satisfies ActionParseTodo;
      })
      .filter((item): item is ActionParseTodo => Boolean(item)),
    meals: meals
      .map((item) => {
        const record = asRecord(item);
        const title = normalizeOptionalString(record.title) ?? "";
        const confidence = normalizeConfidence(record.confidence);
        if (!title || confidence === null) {
          return null;
        }

        const scheduledFor = normalizeDateTime(record.scheduledFor);
        return {
          id: crypto.randomUUID(),
          title,
          notes: normalizeOptionalString(record.notes),
          mealType: normalizeOptionalString(record.mealType),
          scheduledFor,
          servings:
            typeof record.servings === "number" && record.servings > 0
              ? record.servings
              : undefined,
          recipeUrl: normalizeOptionalString(record.recipeUrl),
          confidence,
          source: normalizeOptionalString(record.source)
        } satisfies ActionParseMeal;
      })
      .filter((item): item is ActionParseMeal => Boolean(item)),
    events: events
      .map((item) => {
        const record = asRecord(item);
        const title = normalizeOptionalString(record.title) ?? "";
        const confidence = normalizeConfidence(record.confidence);
        if (!title || confidence === null) {
          return null;
        }

        const startRecord = asRecord(record.start);
        const endRecord = asRecord(record.end);
        const startDateTime = normalizeDateTime(startRecord.dateTime);
        if (!startDateTime) {
          return null;
        }
        const explicitEndDateTime = normalizeDateTime(endRecord.dateTime);
        const endDateTime =
          explicitEndDateTime ?? addMinutes(startDateTime, DEFAULT_EVENT_DURATION_MINUTES);
        if (!endDateTime) {
          return null;
        }
        const endDateTime = normalizeDateTime(endRecord.dateTime);

        const locationRecord = asRecord(record.location);
        return {
          id: crypto.randomUUID(),
          title,
          description: normalizeOptionalString(record.description),
          start: {
            dateTime: startDateTime,
            timeZone: normalizeOptionalString(startRecord.timeZone)
          },
          end: {
            dateTime: endDateTime,
            timeZone:
              normalizeOptionalString(endRecord.timeZone) ??
              normalizeOptionalString(startRecord.timeZone)
          },
          location: record.location
            ? {
                name: normalizeOptionalString(locationRecord.name),
                address: normalizeOptionalString(locationRecord.address),
                meetingUrl: normalizeOptionalString(locationRecord.meetingUrl)
              }
            : undefined,
          confidence,
          source: normalizeOptionalString(record.source)
        } satisfies ActionParseEvent;
      })
      .filter((item): item is ActionParseEvent => Boolean(item))
  };
};
