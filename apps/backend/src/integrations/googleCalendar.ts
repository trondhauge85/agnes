import { google, type calendar_v3 } from "googleapis";

import type {
  CalendarConnection,
  CalendarEvent,
  CalendarEventDateTime,
  CalendarInfo,
  CalendarParticipant
} from "../types";

const DEFAULT_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar"
];

const REQUIRED_SCOPES = ["https://www.googleapis.com/auth/calendar"];

export class GoogleCalendarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarConfigError";
  }
}

export class GoogleCalendarPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarPermissionError";
  }
}

const getGoogleClientConfig = (): { clientId: string; clientSecret: string } => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleCalendarConfigError(
      "Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    );
  }

  return { clientId, clientSecret };
};

const createOAuthClient = (redirectUri?: string): google.auth.OAuth2 => {
  const { clientId, clientSecret } = getGoogleClientConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const createGoogleAuthorizationUrl = (
  redirectUri: string,
  state?: string
): string => {
  const auth = createOAuthClient(redirectUri);
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: DEFAULT_SCOPES,
    include_granted_scopes: true,
    prompt: "consent",
    state
  });
};

const normalizeDateTime = (
  dateTime?: string | null,
  date?: string | null,
  timeZone?: string | null
): CalendarEventDateTime => {
  if (dateTime) {
    return {
      dateTime,
      timeZone: timeZone ?? undefined
    };
  }

  const normalized = date
    ? new Date(`${date}T00:00:00Z`).toISOString()
    : new Date().toISOString();

  return {
    dateTime: normalized,
    timeZone: timeZone ?? undefined
  };
};

const mapParticipantStatus = (
  status?: string | null
): CalendarParticipant["status"] => {
  if (status === "accepted" || status === "declined") {
    return status;
  }
  return "needs_action";
};

const mapAttendees = (
  attendees: calendar_v3.Schema$EventAttendee[] | null | undefined
): CalendarParticipant[] =>
  (attendees ?? []).flatMap((attendee) => {
    if (!attendee?.email) {
      return [];
    }

    return [
      {
        email: attendee.email,
        displayName: attendee.displayName ?? undefined,
        status: mapParticipantStatus(attendee.responseStatus ?? undefined),
        organizer: attendee.organizer ?? false
      }
    ];
  });

const getMeetingUrl = (event: calendar_v3.Schema$Event): string | undefined => {
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  const entryPoints = event.conferenceData?.entryPoints ?? [];
  const entryPoint = entryPoints.find((item) => item.uri);
  return entryPoint?.uri ?? undefined;
};

const getTagsFromEvent = (event: calendar_v3.Schema$Event): string[] => {
  const raw = event.extendedProperties?.private?.tags;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag)).filter((tag) => tag);
    }
  } catch {
    // fall back to comma-separated values
  }

  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag);
};

const mapGoogleEvent = (
  calendarId: string,
  event: calendar_v3.Schema$Event
): CalendarEvent => {
  const meetingUrl = getMeetingUrl(event);
  const locationValue = event.location?.trim();
  const location =
    locationValue || meetingUrl
      ? {
          name: locationValue ?? "Video call",
          meetingUrl
        }
      : undefined;
  const createdAt = event.created ?? new Date().toISOString();
  const updatedAt = event.updated ?? createdAt;

  return {
    id: event.id ?? crypto.randomUUID(),
    calendarId,
    providerEventId: event.id ?? undefined,
    title: event.summary ?? "Untitled event",
    description: event.description ?? undefined,
    location,
    start: normalizeDateTime(
      event.start?.dateTime ?? null,
      event.start?.date ?? null,
      event.start?.timeZone ?? null
    ),
    end: normalizeDateTime(
      event.end?.dateTime ?? null,
      event.end?.date ?? null,
      event.end?.timeZone ?? null
    ),
    status:
      event.status === "tentative" || event.status === "cancelled"
        ? event.status
        : "confirmed",
    participants: mapAttendees(event.attendees),
    tags: getTagsFromEvent(event),
    createdAt,
    updatedAt
  };
};

const buildTagsPayload = (tags?: string[]): { tags: string } | undefined => {
  if (!tags) {
    return undefined;
  }

  return { tags: JSON.stringify(tags) };
};

const buildEventPatch = (
  payload: Partial<CalendarEvent>
): calendar_v3.Schema$Event => {
  const patch: calendar_v3.Schema$Event = {};

  if (payload.title) {
    patch.summary = payload.title;
  }

  if (payload.description !== undefined) {
    patch.description = payload.description ?? undefined;
  }

  if (payload.location) {
    patch.location =
      payload.location.address ??
      payload.location.name ??
      payload.location.meetingUrl ??
      undefined;
  }

  if (payload.start) {
    patch.start = {
      dateTime: payload.start.dateTime,
      timeZone: payload.start.timeZone ?? undefined
    };
  }

  if (payload.end) {
    patch.end = {
      dateTime: payload.end.dateTime,
      timeZone: payload.end.timeZone ?? undefined
    };
  }

  if (payload.status) {
    patch.status = payload.status;
  }

  if (payload.participants) {
    patch.attendees = payload.participants.map((participant) => ({
      email: participant.email,
      displayName: participant.displayName,
      responseStatus:
        participant.status === "accepted" || participant.status === "declined"
          ? participant.status
          : "needsAction"
    }));
  }

  if (payload.tags !== undefined) {
    const tagPayload = buildTagsPayload(payload.tags);
    if (tagPayload) {
      patch.extendedProperties = {
        private: tagPayload
      };
    } else {
      patch.extendedProperties = {
        private: {
          tags: JSON.stringify([])
        }
      };
    }
  }

  return patch;
};

const mapGoogleCalendar = (
  calendar:
    | calendar_v3.Schema$Calendar
    | calendar_v3.Schema$CalendarListEntry
): CalendarInfo => ({
  id: calendar.id ?? crypto.randomUUID(),
  name: calendar.summary ?? "Untitled calendar",
  description: calendar.description ?? undefined,
  timezone: calendar.timeZone ?? "UTC",
  primary: "primary" in calendar ? calendar.primary ?? false : false,
  createdAt: "created" in calendar && calendar.created
    ? calendar.created
    : new Date().toISOString(),
  provider: "google"
});

const createCalendarClient = (
  connection: CalendarConnection
): calendar_v3.Calendar => {
  const auth = createOAuthClient();
  auth.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken
  });

  auth.on("tokens", (tokens) => {
    if (tokens.access_token) {
      connection.accessToken = tokens.access_token;
    }
    if (tokens.refresh_token) {
      connection.refreshToken = tokens.refresh_token;
    }
  });

  return google.calendar({ version: "v3", auth });
};

export const exchangeGoogleAuthorizationCode = async (
  authorizationCode: string,
  redirectUri: string
): Promise<{
  connection: CalendarConnection;
}> => {
  const auth = createOAuthClient(redirectUri);
  const { tokens } = await auth.getToken(authorizationCode);
  auth.setCredentials(tokens);

  const oauth2Client = google.oauth2({ version: "v2", auth });
  const userInfo = await oauth2Client.userinfo.get();

  const scopes = tokens.scope
    ? tokens.scope.split(" ").filter((scope) => scope)
    : DEFAULT_SCOPES;
  const missingScopes = REQUIRED_SCOPES.filter(
    (scope) => !scopes.includes(scope)
  );
  if (missingScopes.length > 0) {
    throw new GoogleCalendarPermissionError(
      "Google Calendar permissions are missing. Reconnect and grant calendar access."
    );
  }

  return {
    connection: {
      provider: "google",
      status: "connected",
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      scopes,
      connectedAt: new Date().toISOString(),
      userEmail: userInfo.data.email ?? undefined
    }
  };
};

export const listGoogleCalendars = async (
  connection: CalendarConnection
): Promise<CalendarInfo[]> => {
  const calendar = createCalendarClient(connection);
  const calendars: CalendarInfo[] = [];
  let pageToken: string | undefined;

  do {
    const response = await calendar.calendarList.list({
      pageToken
    });
    const items = response.data.items ?? [];
    calendars.push(...items.map(mapGoogleCalendar));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return calendars;
};

export const getGoogleCalendar = async (
  connection: CalendarConnection,
  calendarId: string
): Promise<CalendarInfo> => {
  const calendar = createCalendarClient(connection);
  const response = await calendar.calendarList.get({ calendarId });
  return mapGoogleCalendar(response.data);
};

export const createGoogleCalendar = async (
  connection: CalendarConnection,
  name: string,
  description: string | undefined,
  timezone: string
): Promise<CalendarInfo> => {
  const calendar = createCalendarClient(connection);
  const response = await calendar.calendars.insert({
    requestBody: {
      summary: name,
      description,
      timeZone: timezone
    }
  });

  return mapGoogleCalendar(response.data);
};

export const listGoogleEvents = async (
  connection: CalendarConnection,
  calendarId: string,
  filters: {
    start?: string;
    end?: string;
    search?: string;
    limit?: number;
  }
): Promise<CalendarEvent[]> => {
  const calendar = createCalendarClient(connection);
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;
  const maxResults = filters.limit && filters.limit > 0 ? filters.limit : undefined;

  do {
    const response = await calendar.events.list({
      calendarId,
      pageToken,
      timeMin: filters.start,
      timeMax: filters.end,
      q: filters.search,
      maxResults,
      singleEvents: true,
      orderBy: "startTime"
    });
    const items = response.data.items ?? [];
    events.push(...items.map((item) => mapGoogleEvent(calendarId, item)));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken && (!maxResults || events.length < maxResults));

  return maxResults ? events.slice(0, maxResults) : events;
};

export const createGoogleEvent = async (
  connection: CalendarConnection,
  calendarId: string,
  payload: CalendarEvent
): Promise<CalendarEvent> => {
  const calendar = createCalendarClient(connection);
  const tagPayload = buildTagsPayload(payload.tags);
  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: payload.title,
      description: payload.description,
      location:
        payload.location?.address ??
        payload.location?.name ??
        payload.location?.meetingUrl ??
        undefined,
      start: {
        dateTime: payload.start.dateTime,
        timeZone: payload.start.timeZone ?? undefined
      },
      end: {
        dateTime: payload.end.dateTime,
        timeZone: payload.end.timeZone ?? undefined
      },
      status: payload.status,
      attendees: payload.participants.map((participant) => ({
        email: participant.email,
        displayName: participant.displayName,
        responseStatus:
          participant.status === "accepted" ||
          participant.status === "declined"
            ? participant.status
            : "needsAction"
      })),
      extendedProperties: tagPayload
        ? {
            private: tagPayload
          }
        : undefined
    }
  });

  return mapGoogleEvent(calendarId, response.data);
};

export const updateGoogleEvent = async (
  connection: CalendarConnection,
  calendarId: string,
  eventId: string,
  payload: Partial<CalendarEvent>
): Promise<CalendarEvent> => {
  const calendar = createCalendarClient(connection);
  const response = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: buildEventPatch(payload)
  });

  return mapGoogleEvent(calendarId, response.data);
};

export const deleteGoogleEvent = async (
  connection: CalendarConnection,
  calendarId: string,
  eventId: string
): Promise<void> => {
  const calendar = createCalendarClient(connection);
  await calendar.events.delete({ calendarId, eventId });
};
