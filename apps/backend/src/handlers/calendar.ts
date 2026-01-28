import type {
  CalendarConnection,
  CalendarEvent,
  CalendarEventCreatePayload,
  CalendarEventListFilters,
  CalendarEventUpdatePayload,
  CalendarInfo,
  CalendarOAuthStartPayload,
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
  GoogleCalendarPermissionError,
  createGoogleAuthorizationUrl,
  createGoogleCalendar,
  createGoogleEvent,
  deleteGoogleEvent,
  exchangeGoogleAuthorizationCode,
  getGoogleEvent,
  getGoogleCalendar,
  listGoogleCalendars,
  listGoogleEvents,
  updateGoogleEvent
} from "../integrations/googleCalendar";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

const supportedProviders: CalendarProvider[] = ["google"];

type CalendarIntegration = {
  createAuthorizationUrl: (redirectUri: string, state?: string) => string;
  exchangeAuthorizationCode: (
    authorizationCode: string,
    redirectUri: string
  ) => Promise<{ connection: CalendarConnection }>;
  listCalendars: (connection: CalendarConnection) => Promise<CalendarInfo[]>;
  getCalendar: (
    connection: CalendarConnection,
    calendarId: string
  ) => Promise<CalendarInfo>;
  createCalendar: (
    connection: CalendarConnection,
    name: string,
    description: string | undefined,
    timezone: string
  ) => Promise<CalendarInfo>;
  listEvents: (
    connection: CalendarConnection,
    calendarId: string,
    filters: {
      start?: string;
      end?: string;
      search?: string;
      limit?: number;
    }
  ) => Promise<CalendarEvent[]>;
  getEvent: (
    connection: CalendarConnection,
    calendarId: string,
    eventId: string
  ) => Promise<CalendarEvent>;
  createEvent: (
    connection: CalendarConnection,
    calendarId: string,
    event: CalendarEvent
  ) => Promise<CalendarEvent>;
  updateEvent: (
    connection: CalendarConnection,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ) => Promise<CalendarEvent>;
  deleteEvent: (
    connection: CalendarConnection,
    calendarId: string,
    eventId: string
  ) => Promise<void>;
};

const calendarIntegrations: Record<CalendarProvider, CalendarIntegration> = {
  google: {
    createAuthorizationUrl: createGoogleAuthorizationUrl,
    exchangeAuthorizationCode: exchangeGoogleAuthorizationCode,
    listCalendars: listGoogleCalendars,
    getCalendar: getGoogleCalendar,
    createCalendar: createGoogleCalendar,
    listEvents: listGoogleEvents,
    getEvent: getGoogleEvent,
    createEvent: createGoogleEvent,
    updateEvent: updateGoogleEvent,
    deleteEvent: deleteGoogleEvent
  }
};

const ensureProvider = (provider: string): CalendarProvider | null => {
  if (!supportedProviders.includes(provider as CalendarProvider)) {
    return null;
  }
  return provider as CalendarProvider;
};

const getCalendarIntegration = (
  provider: CalendarProvider
): CalendarIntegration => calendarIntegrations[provider];

const ensureConnected = async (
  provider: CalendarProvider
): Promise<CalendarConnection | null> => getCalendarConnection(provider);

const ensureSelectedCalendar = async (
  provider: CalendarProvider,
  familyId: string
): Promise<string | null> => getSelectedCalendarId(provider, familyId);

const ensureFamilyId = (value?: string | null): string | null => {
  const normalized = normalizeString(value ?? "");
  return normalized || null;
};

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

const normalizeRecurrence = (recurrence?: string[]): string[] | undefined => {
  if (!recurrence) {
    return undefined;
  }
  const normalized = recurrence
    .map((rule) => normalizeString(rule))
    .filter((rule) => rule);
  return normalized.length > 0 ? normalized : undefined;
};

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

export const handleCalendarProviders = (): Response =>
  createJsonResponse({
    providers: supportedProviders
  });

export const handleCalendarOAuthStart = async (
  request: Request
): Promise<Response> => {
  const body = await parseJsonBody<CalendarOAuthStartPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const provider = ensureProvider(normalizeString(body.provider ?? ""));
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: body.provider }
    });
  }

  const redirectUri = normalizeString(body.redirectUri ?? "");
  if (!redirectUri) {
    return createErrorResponse({
      code: "bad_request",
      message: "redirectUri is required.",
      messageKey: "errors.calendar.redirect_uri_required",
      status: 400,
      details: { field: "redirectUri", reason: "required" }
    });
  }

  try {
    const integration = getCalendarIntegration(provider);
    const authUrl = integration.createAuthorizationUrl(
      redirectUri,
      body.state ?? undefined
    );
    return createJsonResponse({
      status: "pending",
      provider,
      redirectUri,
      authUrl,
      state: body.state ?? null
    });
  } catch (error) {
    return createCalendarErrorResponse(error);
  }
};

export const handleCalendarSetup = async (
  request: Request
): Promise<Response> => {
  const body = await parseJsonBody<CalendarSetupPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const provider = ensureProvider(normalizeString(body.provider ?? ""));
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: body.provider }
    });
  }

  if (!body.authorizationCode || !body.redirectUri) {
    return createErrorResponse({
      code: "bad_request",
      message: "authorizationCode and redirectUri are required.",
      messageKey: "errors.calendar.authorization_required",
      status: 400,
      details: {
        fields: ["authorizationCode", "redirectUri"],
        reason: "required"
      }
    });
  }

  try {
    const integration = getCalendarIntegration(provider);
    const { connection } = await integration.exchangeAuthorizationCode(
      body.authorizationCode,
      body.redirectUri
    );
    await connectCalendarProvider(provider, connection);

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
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: providerParam }
    });
  }

  const familyId = ensureFamilyId(url.searchParams.get("familyId"));
  if (!familyId) {
    return createErrorResponse({
      code: "bad_request",
      message: "familyId is required.",
      messageKey: "errors.calendar.family_required",
      status: 400,
      details: { field: "familyId", reason: "required" }
    });
  }

  const connection = await ensureConnected(provider);
  if (!connection) {
    return createErrorResponse({
      code: "conflict",
      message: "Calendar provider is not connected.",
      messageKey: "errors.calendar.not_connected",
      status: 409,
      details: { provider }
    });
  }

  try {
    const integration = getCalendarIntegration(provider);
    const calendars = await integration.listCalendars(connection);
    return createJsonResponse({
      familyId,
      provider,
      calendars,
      selectedCalendarId: await getSelectedCalendarId(provider, familyId)
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
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const provider = ensureProvider(normalizeString(body.provider ?? ""));
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: body.provider }
    });
  }

  const familyId = ensureFamilyId(body.familyId);
  if (!familyId) {
    return createErrorResponse({
      code: "bad_request",
      message: "familyId is required.",
      messageKey: "errors.calendar.family_required",
      status: 400,
      details: { field: "familyId", reason: "required" }
    });
  }

  const connection = await ensureConnected(provider);
  if (!connection) {
    return createErrorResponse({
      code: "conflict",
      message: "Calendar provider is not connected.",
      messageKey: "errors.calendar.not_connected",
      status: 409,
      details: { provider }
    });
  }

  let calendar: CalendarInfo | null = null;

  try {
    const integration = getCalendarIntegration(provider);
    if (body.calendarId) {
      calendar = await integration.getCalendar(connection, body.calendarId);
    } else {
      const name = normalizeString(body.name ?? "");
      if (!name) {
        return createErrorResponse({
          code: "bad_request",
          message: "calendarId or name is required.",
          messageKey: "errors.calendar.select_required",
          status: 400,
          details: { fields: ["calendarId", "name"], reason: "required" }
        });
      }

      calendar = await integration.createCalendar(
        connection,
        name,
        normalizeString(body.description ?? "") || undefined,
        normalizeString(body.timezone ?? "UTC")
      );
    }

    await setSelectedCalendar(provider, familyId, calendar.id);

    return createJsonResponse({
      status: "selected",
      provider,
      familyId,
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
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const familyId = ensureFamilyId(url.searchParams.get("familyId"));
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: providerParam }
    });
  }

  if (!familyId) {
    return createErrorResponse({
      code: "bad_request",
      message: "familyId is required.",
      messageKey: "errors.calendar.family_required",
      status: 400,
      details: { field: "familyId", reason: "required" }
    });
  }

  const connection = await ensureConnected(provider);
  if (!connection) {
    return createErrorResponse({
      code: "conflict",
      message: "Calendar provider is not connected.",
      messageKey: "errors.calendar.not_connected",
      status: 409,
      details: { provider }
    });
  }

  const calendarId = await ensureSelectedCalendar(provider, familyId);
  if (!calendarId) {
    return createErrorResponse({
      code: "conflict",
      message: "No calendar selected for provider.",
      messageKey: "errors.calendar.not_selected",
      status: 409,
      details: { provider }
    });
  }

  const title = normalizeString(body.title ?? "");
  if (!title) {
    return createErrorResponse({
      code: "bad_request",
      message: "Event title is required.",
      messageKey: "errors.calendar.event_title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  if (!body.start?.dateTime || !body.end?.dateTime) {
    return createErrorResponse({
      code: "bad_request",
      message: "Event start and end dateTime are required.",
      messageKey: "errors.calendar.event_datetime_required",
      status: 400,
      details: { fields: ["start.dateTime", "end.dateTime"], reason: "required" }
    });
  }

  const event: CalendarEvent = {
    id: "",
    calendarId,
    providerEventId: undefined,
    origin: "app",
    title,
    description: normalizeString(body.description ?? "") || undefined,
    location: body.location,
    start: body.start,
    end: body.end,
    recurrence: normalizeRecurrence(body.recurrence),
    status: body.status ?? "confirmed",
    participants: normalizeParticipantList(body.participants),
    tags: normalizeTags(body.tags),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const integration = getCalendarIntegration(provider);
    const created = await integration.createEvent(connection, calendarId, event);
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
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const url = new URL(request.url);
  const providerParam = normalizeString(url.searchParams.get("provider") ?? "");
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: providerParam }
    });
  }

  if (!familyId) {
    return createErrorResponse({
      code: "bad_request",
      message: "familyId is required.",
      messageKey: "errors.calendar.family_required",
      status: 400,
      details: { field: "familyId", reason: "required" }
    });
  }

  const connection = await ensureConnected(provider);
  if (!connection) {
    return createErrorResponse({
      code: "conflict",
      message: "Calendar provider is not connected.",
      messageKey: "errors.calendar.not_connected",
      status: 409,
      details: { provider }
    });
  }

  const calendarId = await ensureSelectedCalendar(provider, familyId);
  if (!calendarId) {
    return createErrorResponse({
      code: "conflict",
      message: "No calendar selected for provider.",
      messageKey: "errors.calendar.not_selected",
      status: 409,
      details: { provider }
    });
  }

  const updatePayload: Partial<CalendarEvent> = {
    title: body.title ? normalizeString(body.title) : undefined,
    description: body.description
      ? normalizeString(body.description)
      : undefined,
    location: body.location,
    start: body.start,
    end: body.end,
    recurrence: body.recurrence ? normalizeRecurrence(body.recurrence) : undefined,
    status: body.status,
    participants: body.participants
      ? normalizeParticipantList(body.participants)
      : undefined,
    tags: body.tags ? normalizeTags(body.tags) : undefined,
    updatedAt: new Date().toISOString()
  };

  try {
    const integration = getCalendarIntegration(provider);
    if (body.tags) {
      const existing = await integration.getEvent(
        connection,
        calendarId,
        eventId
      );
      if (existing.origin === "app") {
        updatePayload.origin = "app";
      }
    }
    const updated = await integration.updateEvent(
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
  const familyId = ensureFamilyId(url.searchParams.get("familyId"));
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: providerParam }
    });
  }

  if (!familyId) {
    return createErrorResponse({
      code: "bad_request",
      message: "familyId is required.",
      messageKey: "errors.calendar.family_required",
      status: 400,
      details: { field: "familyId", reason: "required" }
    });
  }

  const connection = await ensureConnected(provider);
  if (!connection) {
    return createErrorResponse({
      code: "conflict",
      message: "Calendar provider is not connected.",
      messageKey: "errors.calendar.not_connected",
      status: 409,
      details: { provider }
    });
  }

  const calendarId = await ensureSelectedCalendar(provider, familyId);
  if (!calendarId) {
    return createErrorResponse({
      code: "conflict",
      message: "No calendar selected for provider.",
      messageKey: "errors.calendar.not_selected",
      status: 409,
      details: { provider }
    });
  }

  try {
    const integration = getCalendarIntegration(provider);
    await integration.deleteEvent(connection, calendarId, eventId);
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
  const familyId = ensureFamilyId(url.searchParams.get("familyId"));
  const provider = ensureProvider(providerParam || "google");
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported calendar provider.",
      messageKey: "errors.calendar.provider_unsupported",
      status: 400,
      details: { provider: providerParam }
    });
  }

  if (!familyId) {
    return createErrorResponse({
      code: "bad_request",
      message: "familyId is required.",
      messageKey: "errors.calendar.family_required",
      status: 400,
      details: { field: "familyId", reason: "required" }
    });
  }

  const connection = await ensureConnected(provider);
  if (!connection) {
    return createErrorResponse({
      code: "conflict",
      message: "Calendar provider is not connected.",
      messageKey: "errors.calendar.not_connected",
      status: 409,
      details: { provider }
    });
  }

  const calendarId = await ensureSelectedCalendar(provider, familyId);
  if (!calendarId) {
    return createErrorResponse({
      code: "conflict",
      message: "No calendar selected for provider.",
      messageKey: "errors.calendar.not_selected",
      status: 409,
      details: { provider }
    });
  }

  const filters = normalizeEventFilters(url);

  try {
    const integration = getCalendarIntegration(provider);
    const events = await integration.listEvents(connection, calendarId, {
      start: filters.start,
      end: filters.end,
      search: filters.search,
      limit: filters.limit
    });
    const filtered = applyFilters(events, filters);

    return createJsonResponse({
      familyId,
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
    return createErrorResponse({
      code: "internal_error",
      message: error.message,
      messageKey: "errors.calendar.configuration",
      status: 500
    });
  }
  if (error instanceof GoogleCalendarPermissionError) {
    return createErrorResponse({
      code: "forbidden",
      message: error.message,
      messageKey: "errors.calendar.permission_required",
      status: 403
    });
  }

  const message =
    extractGoogleApiError(error) ?? "Google Calendar request failed.";
  return createErrorResponse({
    code: "bad_gateway",
    message,
    messageKey: "errors.calendar.provider_error",
    status: 502
  });
};
