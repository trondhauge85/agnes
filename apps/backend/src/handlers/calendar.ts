import type {
  CalendarConnection,
  CalendarEvent,
  CalendarEventCreatePayload,
  CalendarEventListFilters,
  CalendarEventUpdatePayload,
  CalendarInfo,
  CalendarSelectPayload,
  CalendarSetupPayload,
  CalendarProvider,
  CalendarParticipant
} from "../types";
import {
  connectCalendarProvider,
  deleteEvent,
  getCalendarById,
  getCalendarConnection,
  getEvent,
  getSelectedCalendarId,
  listCalendars,
  listEvents,
  saveCalendar,
  saveEvent,
  setSelectedCalendar
} from "../data/calendar";
import { createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

const supportedProviders: CalendarProvider[] = ["google"];

const ensureProvider = (provider: string): CalendarProvider | null => {
  if (!supportedProviders.includes(provider as CalendarProvider)) {
    return null;
  }
  return provider as CalendarProvider;
};

const ensureConnected = (
  provider: CalendarProvider
): CalendarConnection | null => getCalendarConnection(provider);

const ensureSelectedCalendar = (provider: CalendarProvider): string | null =>
  getSelectedCalendarId(provider);

const normalizeParticipant = (
  participant: CalendarParticipant
): CalendarParticipant | null => {
  const email = normalizeString(participant.email ?? "");
  if (!email) {
    return null;
  }

  return {
    email,
    displayName: normalizeString(participant.displayName ?? "") || undefined,
    status: participant.status ?? "needs_action",
    organizer: participant.organizer ?? false
  };
};

const normalizeParticipantList = (
  participants: CalendarParticipant[] | undefined
): CalendarParticipant[] =>
  (participants ?? [])
    .map(normalizeParticipant)
    .filter((participant): participant is CalendarParticipant =>
      Boolean(participant)
    );

const normalizeTags = (tags?: string[]): string[] =>
  (tags ?? [])
    .map((tag) => normalizeString(tag))
    .filter((tag) => Boolean(tag));

const normalizeEventFilters = (url: URL): CalendarEventListFilters => ({
  start: normalizeString(url.searchParams.get("start") ?? "") || undefined,
  end: normalizeString(url.searchParams.get("end") ?? "") || undefined,
  participant:
    normalizeString(url.searchParams.get("participant") ?? "") || undefined,
  status:
    (normalizeString(url.searchParams.get("status") ?? "") as
      | CalendarEvent["status"]
      | "") || undefined,
  tag: normalizeString(url.searchParams.get("tag") ?? "") || undefined,
  search: normalizeString(url.searchParams.get("search") ?? "") || undefined,
  limit: url.searchParams.get("limit")
    ? Number(url.searchParams.get("limit"))
    : undefined
});

const applyFilters = (
  events: CalendarEvent[],
  filters: CalendarEventListFilters
): CalendarEvent[] => {
  const startLimit = filters.start ? Date.parse(filters.start) : null;
  const endLimit = filters.end ? Date.parse(filters.end) : null;
  const participant = filters.participant?.toLowerCase();
  const status = filters.status;
  const tag = filters.tag?.toLowerCase();
  const search = filters.search?.toLowerCase();
  const limit = filters.limit && Number.isFinite(filters.limit)
    ? Math.max(filters.limit, 1)
    : undefined;

  const filtered = events.filter((event) => {
    if (startLimit && Date.parse(event.end.dateTime) < startLimit) {
      return false;
    }
    if (endLimit && Date.parse(event.start.dateTime) > endLimit) {
      return false;
    }
    if (participant) {
      const matchesParticipant = event.participants.some((item) =>
        item.email.toLowerCase().includes(participant)
      );
      if (!matchesParticipant) {
        return false;
      }
    }
    if (status && event.status !== status) {
      return false;
    }
    if (tag) {
      const matchesTag = event.tags.some(
        (item) => item.toLowerCase() === tag
      );
      if (!matchesTag) {
        return false;
      }
    }
    if (search) {
      const haystack = [
        event.title,
        event.description ?? "",
        event.location?.name ?? "",
        event.location?.address ?? ""
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (limit) {
    return filtered.slice(0, limit);
  }

  return filtered;
};

export const handleCalendarProviders = async (): Promise<Response> =>
  createJsonResponse({
    providers: supportedProviders
  });

export const handleCalendarSetup = async (
  request: Request
): Promise<Response> => {
  const body = await parseJsonBody<CalendarSetupPayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const provider = ensureProvider(normalizeString(body.provider ?? ""));
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  if (!body.authorizationCode || !body.redirectUri) {
    return createJsonResponse(
      { error: "authorizationCode and redirectUri are required." },
      400
    );
  }

  const connection: CalendarConnection = {
    provider,
    status: "connected",
    accessToken: `mock-access-${crypto.randomUUID()}`,
    refreshToken: `mock-refresh-${crypto.randomUUID()}`,
    scopes: ["openid", "email", "profile", "calendar.readwrite"],
    connectedAt: new Date().toISOString(),
    userEmail: "family@example.com"
  };

  connectCalendarProvider(provider, connection);

  return createJsonResponse({
    status: "connected",
    provider,
    connection
  });
};

export const handleCalendarList = async (
  request: Request
): Promise<Response> => {
  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  const connection = ensureConnected(provider);
  if (!connection) {
    return createJsonResponse(
      { error: "Calendar provider is not connected." },
      409
    );
  }

  const calendars = listCalendars(provider);
  return createJsonResponse({
    provider,
    calendars,
    selectedCalendarId: getSelectedCalendarId(provider)
  });
};

export const handleCalendarSelect = async (
  request: Request
): Promise<Response> => {
  const body = await parseJsonBody<CalendarSelectPayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const provider = ensureProvider(normalizeString(body.provider ?? ""));
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  const connection = ensureConnected(provider);
  if (!connection) {
    return createJsonResponse(
      { error: "Calendar provider is not connected." },
      409
    );
  }

  const now = new Date().toISOString();
  let calendar: CalendarInfo | null = null;

  if (body.calendarId) {
    calendar = getCalendarById(provider, body.calendarId);
    if (!calendar) {
      return createJsonResponse({ error: "Calendar not found." }, 404);
    }
  } else {
    const name = normalizeString(body.name ?? "");
    if (!name) {
      return createJsonResponse(
        { error: "calendarId or name is required." },
        400
      );
    }

    calendar = {
      id: crypto.randomUUID(),
      name,
      description: normalizeString(body.description ?? "") || undefined,
      timezone: normalizeString(body.timezone ?? "UTC"),
      primary: body.primary ?? false,
      createdAt: now,
      provider
    };
    saveCalendar(provider, calendar);
  }

  setSelectedCalendar(provider, calendar.id);

  return createJsonResponse({
    status: "selected",
    provider,
    calendar
  });
};

export const handleCalendarEventCreate = async (
  request: Request
): Promise<Response> => {
  const body = await parseJsonBody<CalendarEventCreatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  const connection = ensureConnected(provider);
  if (!connection) {
    return createJsonResponse(
      { error: "Calendar provider is not connected." },
      409
    );
  }

  const calendarId = ensureSelectedCalendar(provider);
  if (!calendarId) {
    return createJsonResponse(
      { error: "No calendar selected for provider." },
      409
    );
  }

  const title = normalizeString(body.title ?? "");
  if (!title) {
    return createJsonResponse({ error: "Event title is required." }, 400);
  }

  if (!body.start?.dateTime || !body.end?.dateTime) {
    return createJsonResponse(
      { error: "Event start and end dateTime are required." },
      400
    );
  }

  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: crypto.randomUUID(),
    calendarId,
    providerEventId: `google-${crypto.randomUUID()}`,
    title,
    description: normalizeString(body.description ?? "") || undefined,
    location: body.location,
    start: body.start,
    end: body.end,
    status: body.status ?? "confirmed",
    participants: normalizeParticipantList(body.participants),
    tags: normalizeTags(body.tags),
    createdAt: now,
    updatedAt: now
  };

  saveEvent(calendarId, event);

  return createJsonResponse({ status: "created", event });
};

export const handleCalendarEventUpdate = async (
  request: Request,
  eventId: string
): Promise<Response> => {
  const body = await parseJsonBody<CalendarEventUpdatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  const connection = ensureConnected(provider);
  if (!connection) {
    return createJsonResponse(
      { error: "Calendar provider is not connected." },
      409
    );
  }

  const calendarId = ensureSelectedCalendar(provider);
  if (!calendarId) {
    return createJsonResponse(
      { error: "No calendar selected for provider." },
      409
    );
  }

  const existing = getEvent(calendarId, eventId);
  if (!existing) {
    return createJsonResponse({ error: "Event not found." }, 404);
  }

  const updated: CalendarEvent = {
    ...existing,
    title: body.title ? normalizeString(body.title) : existing.title,
    description: body.description
      ? normalizeString(body.description)
      : existing.description,
    location: body.location ?? existing.location,
    start: body.start ?? existing.start,
    end: body.end ?? existing.end,
    status: body.status ?? existing.status,
    participants: body.participants
      ? normalizeParticipantList(body.participants)
      : existing.participants,
    tags: body.tags ? normalizeTags(body.tags) : existing.tags,
    updatedAt: new Date().toISOString()
  };

  saveEvent(calendarId, updated);

  return createJsonResponse({ status: "updated", event: updated });
};

export const handleCalendarEventDelete = async (
  request: Request,
  eventId: string
): Promise<Response> => {
  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  const connection = ensureConnected(provider);
  if (!connection) {
    return createJsonResponse(
      { error: "Calendar provider is not connected." },
      409
    );
  }

  const calendarId = ensureSelectedCalendar(provider);
  if (!calendarId) {
    return createJsonResponse(
      { error: "No calendar selected for provider." },
      409
    );
  }

  const removed = deleteEvent(calendarId, eventId);
  if (!removed) {
    return createJsonResponse({ error: "Event not found." }, 404);
  }

  return createJsonResponse({ status: "deleted", eventId });
};

export const handleCalendarEventList = async (
  request: Request
): Promise<Response> => {
  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createJsonResponse({ error: "Unsupported calendar provider." }, 400);
  }

  const connection = ensureConnected(provider);
  if (!connection) {
    return createJsonResponse(
      { error: "Calendar provider is not connected." },
      409
    );
  }

  const calendarId = ensureSelectedCalendar(provider);
  if (!calendarId) {
    return createJsonResponse(
      { error: "No calendar selected for provider." },
      409
    );
  }

  const filters = normalizeEventFilters(url);
  const events = listEvents(calendarId);
  const filtered = applyFilters(events, filters);

  return createJsonResponse({
    calendarId,
    provider,
    filters,
    events: filtered
  });
};
