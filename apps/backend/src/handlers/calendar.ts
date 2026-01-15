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
  getCalendarConnection,
  getSelectedCalendarId,
  setSelectedCalendar
} from "../data/calendar";
import {
  GoogleCalendarConfigError,
  createGoogleCalendar,
  createGoogleEvent,
  deleteGoogleEvent,
  exchangeGoogleAuthorizationCode,
  getGoogleCalendar,
  listGoogleCalendars,
  listGoogleEvents,
  updateGoogleEvent
} from "../integrations/googleCalendar";
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

  try {
    const { connection } = await exchangeGoogleAuthorizationCode(
      body.authorizationCode,
      body.redirectUri
    );
    connectCalendarProvider(provider, connection);

    return createJsonResponse({
      status: "connected",
      provider,
      connection
    });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
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

  try {
    const calendars = await listGoogleCalendars(connection);
    return createJsonResponse({
      provider,
      calendars,
      selectedCalendarId: getSelectedCalendarId(provider)
    });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
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

  let calendar: CalendarInfo | null = null;

  try {
    if (body.calendarId) {
      calendar = await getGoogleCalendar(connection, body.calendarId);
    } else {
      const name = normalizeString(body.name ?? "");
      if (!name) {
        return createJsonResponse(
          { error: "calendarId or name is required." },
          400
        );
      }

      calendar = await createGoogleCalendar(
        connection,
        name,
        normalizeString(body.description ?? "") || undefined,
        normalizeString(body.timezone ?? "UTC")
      );
    }

    setSelectedCalendar(provider, calendar.id);

    return createJsonResponse({
      status: "selected",
      provider,
      calendar
    });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
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

  const event: CalendarEvent = {
    id: "",
    calendarId,
    providerEventId: undefined,
    title,
    description: normalizeString(body.description ?? "") || undefined,
    location: body.location,
    start: body.start,
    end: body.end,
    status: body.status ?? "confirmed",
    participants: normalizeParticipantList(body.participants),
    tags: normalizeTags(body.tags),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const created = await createGoogleEvent(connection, calendarId, event);
    return createJsonResponse({ status: "created", event: created });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
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

  const updatePayload: Partial<CalendarEvent> = {
    title: body.title ? normalizeString(body.title) : undefined,
    description: body.description
      ? normalizeString(body.description)
      : undefined,
    location: body.location,
    start: body.start,
    end: body.end,
    status: body.status,
    participants: body.participants
      ? normalizeParticipantList(body.participants)
      : undefined,
    tags: body.tags ? normalizeTags(body.tags) : undefined,
    updatedAt: new Date().toISOString()
  };

  try {
    const updated = await updateGoogleEvent(
      connection,
      calendarId,
      eventId,
      updatePayload
    );
    return createJsonResponse({ status: "updated", event: updated });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
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

  try {
    await deleteGoogleEvent(connection, calendarId, eventId);
    return createJsonResponse({ status: "deleted", eventId });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
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

  try {
    const events = await listGoogleEvents(connection, calendarId, {
      start: filters.start,
      end: filters.end,
      search: filters.search,
      limit: filters.limit
    });
    const filtered = applyFilters(events, filters);

    return createJsonResponse({
      calendarId,
      provider,
      filters,
      events: filtered
    });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
};

const extractGoogleApiError = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  const response = (error as { response?: { data?: unknown } }).response;
  if (response?.data && typeof response.data === "object") {
    const data = response.data as { error?: { message?: string } };
    if (data.error?.message) {
      return data.error.message;
    }
  }

  return null;
};

const createCalendarErrorResponse = (error: unknown): Response => {
  if (error instanceof GoogleCalendarConfigError) {
    return createJsonResponse({ error: error.message }, 500);
  }

  const message =
    extractGoogleApiError(error) ?? "Google Calendar request failed.";
  return createJsonResponse({ error: message }, 502);
};
