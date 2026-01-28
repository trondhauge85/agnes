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
  language?: string;
  familyId?: string;
  context?: ActionParseContext;
  schemas?: ActionParseSchemas;
};

export type ActionParseContextMember = {
  name: string;
  role?: string;
  age?: number;
};

export type ActionParseContext = {
  familyMembers?: ActionParseContextMember[];
  currentDateTime?: string;
  timezone?: string;
  weekNumber?: number;
  weekday?: string;
  locale?: string;
  sourceMetadata?: Record<string, unknown>;
};

export type ActionParseSchemas = {
  eventSchema?: Record<string, unknown>;
  todoSchema?: Record<string, unknown>;
  shoppingItemSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
};

export type ActionParseTodo = {
  id: string;
  title: string;
  notes?: string;
  recurrence?: string[];
  confidence: number;
  confidenceReasons?: string[];
  source?: string;
};

export type ActionParseShoppingItem = {
  id: string;
  title: string;
  notes?: string;
  confidence: number;
  confidenceReasons?: string[];
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
  recurrence?: string[];
  confidence: number;
  confidenceReasons?: string[];
  source?: string;
};

export type ActionParseResult = {
  todos: ActionParseTodo[];
  shoppingItems: ActionParseShoppingItem[];
  events: ActionParseEvent[];
};

const normalizeConfidence = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(1, Math.max(0, value));
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((item) => normalizeString(typeof item === "string" ? item : ""))
    .filter((item) => item);
  return normalized.length > 0 ? normalized : undefined;
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
  return normalized;
};

const normalizeRecurrence = (value: unknown): string[] | undefined =>
  normalizeStringArray(value);

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

const normalizeKeySegment = (value: string | undefined): string =>
  normalizeString(value ?? "").toLowerCase();

const normalizeKeyArray = (value: string[] | undefined): string =>
  Array.isArray(value) ? value.map((item) => normalizeKeySegment(item)).join("|") : "";

const dedupeByKey = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildTodoKey = (item: ActionParseTodo): string =>
  [
    normalizeKeySegment(item.title),
    normalizeKeySegment(item.notes),
    normalizeKeyArray(item.recurrence)
  ].join("|");

const buildShoppingItemKey = (item: ActionParseShoppingItem): string =>
  [normalizeKeySegment(item.title), normalizeKeySegment(item.notes)].join("|");

const buildEventKey = (item: ActionParseEvent): string => {
  const location = item.location ?? {};
  return [
    normalizeKeySegment(item.title),
    normalizeKeySegment(item.description),
    normalizeKeySegment(item.start?.dateTime),
    normalizeKeySegment(item.start?.timeZone),
    normalizeKeySegment(item.end?.dateTime),
    normalizeKeySegment(item.end?.timeZone),
    normalizeKeySegment(location.name),
    normalizeKeySegment(location.address),
    normalizeKeySegment(location.meetingUrl),
    normalizeKeyArray(item.recurrence)
  ].join("|");
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const extractJsonCandidate = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) {
    return trimmed;
  }
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
};

const parseJsonResponse = (content: string): Record<string, unknown> => {
  const candidates = [content, extractJsonCandidate(content)]
    .map((candidate) => candidate.trim())
    .filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch (error) {
      continue;
    }
  }
  throw new Error("LLM response was not valid JSON.");
};

const getDatePartsForTimeZone = (
  date: Date,
  timeZone: string,
  locale: string
): { year: number; month: number; day: number; weekday: string } => {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(lookup("year")),
    month: Number(lookup("month")),
    day: Number(lookup("day")),
    weekday: lookup("weekday")
  };
};

const getIsoWeekNumber = (date: Date): number => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
};

const buildContextJson = (input: ActionParseInput): Record<string, unknown> => {
  const timeZone = normalizeOptionalString(input.context?.timezone) ?? input.timezone ?? "UTC";
  const locale = normalizeOptionalString(input.context?.locale) ?? input.locale ?? "en-US";
  const now = new Date();
  const parts = getDatePartsForTimeZone(now, timeZone, locale);
  const weekNumber =
    typeof input.context?.weekNumber === "number"
      ? input.context.weekNumber
      : getIsoWeekNumber(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
  const weekday = normalizeOptionalString(input.context?.weekday) ?? parts.weekday;
  const currentDateTime =
    normalizeOptionalString(input.context?.currentDateTime) ?? now.toISOString();
  const defaultSourceMetadata = {
    fileCount: input.files?.length ?? 0,
    fileNames: input.files?.map((file) => file.name) ?? [],
    hasText: Boolean(normalizeString(input.text ?? ""))
  };

  return {
    familyMembers: Array.isArray(input.context?.familyMembers)
      ? input.context.familyMembers
      : [],
    currentDateTime,
    timezone: timeZone,
    weekNumber,
    weekday,
    locale,
    sourceMetadata: input.context?.sourceMetadata ?? defaultSourceMetadata
  };
};

const buildSchemasJson = (input: ActionParseInput): Record<string, unknown> => {
  if (input.schemas) {
    return {
      eventSchema: input.schemas.eventSchema,
      todoSchema: input.schemas.todoSchema,
      shoppingItemSchema: input.schemas.shoppingItemSchema,
      outputSchema: input.schemas.outputSchema
    };
  }

  return {
    eventSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        start: { type: "object" },
        end: { type: "object" },
        location: { type: "object" },
        recurrence: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
        confidenceReasons: { type: "array", items: { type: "string" } },
        source: { type: "string" },
        notes: { type: "string" }
      }
    },
    todoSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        notes: { type: "string" },
        recurrence: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
        confidenceReasons: { type: "array", items: { type: "string" } },
        source: { type: "string" }
      }
    },
    shoppingItemSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        notes: { type: "string" },
        confidence: { type: "number" },
        confidenceReasons: { type: "array", items: { type: "string" } },
        source: { type: "string" }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        todos: { type: "array", items: { type: "object" } },
        shoppingItems: { type: "array", items: { type: "object" } },
        events: { type: "array", items: { type: "object" } }
      },
      required: ["todos", "shoppingItems", "events"]
    }
  };
};

const formatJsonBlock = (value: Record<string, unknown>): string =>
  JSON.stringify(value, null, 2);

export const parseActionableItems = async (
  llmService: LlmService,
  input: ActionParseInput
): Promise<ActionParseResult> => {
  const sourceText = normalizeSourceText(input);
  const contextJson = buildContextJson(input);
  const schemasJson = buildSchemasJson(input);
  const task = await llmService.runTask({
    skillName: "extract_actionable_items",
    input: {
      contextJson: formatJsonBlock(contextJson),
      schemasJson: formatJsonBlock(schemasJson),
      input: sourceText
    },
    maxTokens: 2000,
    temperature: 0
  });

  const responseContent = task.response.message.content ?? "";
  const parsed = parseJsonResponse(responseContent);

  const todos = Array.isArray(parsed.todos) ? parsed.todos : [];
  const shoppingItems = Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems : [];
  const events = Array.isArray(parsed.events) ? parsed.events : [];

  return {
    todos: dedupeByKey(
      todos
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
            recurrence: normalizeRecurrence(record.recurrence),
            confidence,
            confidenceReasons: normalizeStringArray(record.confidenceReasons),
            source: normalizeOptionalString(record.source)
          } satisfies ActionParseTodo;
        })
        .filter((item): item is ActionParseTodo => Boolean(item)),
      buildTodoKey
    ),
    shoppingItems: dedupeByKey(
      shoppingItems
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
            confidenceReasons: normalizeStringArray(record.confidenceReasons),
            source: normalizeOptionalString(record.source)
          } satisfies ActionParseShoppingItem;
        })
        .filter((item): item is ActionParseShoppingItem => Boolean(item)),
      buildShoppingItemKey
    ),
    events: dedupeByKey(
      events
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
          const explicitEndDateTime = normalizeDateTime(endRecord.dateTime);

          const locationRecord = asRecord(record.location);
          return {
            id: crypto.randomUUID(),
            title,
            description: normalizeOptionalString(record.description),
            start: startDateTime
              ? {
                  dateTime: startDateTime,
                  timeZone: normalizeOptionalString(startRecord.timeZone)
                }
              : undefined,
            end: explicitEndDateTime
              ? {
                  dateTime: explicitEndDateTime,
                  timeZone:
                    normalizeOptionalString(endRecord.timeZone) ??
                    normalizeOptionalString(startRecord.timeZone)
                }
              : undefined,
            location: record.location
              ? {
                  name: normalizeOptionalString(locationRecord.name),
                  address: normalizeOptionalString(locationRecord.address),
                  meetingUrl: normalizeOptionalString(locationRecord.meetingUrl)
                }
              : undefined,
            recurrence: normalizeRecurrence(record.recurrence),
            confidence,
            confidenceReasons: normalizeStringArray(record.confidenceReasons),
            source: normalizeOptionalString(record.source)
          } satisfies ActionParseEvent;
        })
        .filter((item): item is ActionParseEvent => Boolean(item)),
      buildEventKey
    )
  };
};
