import type {
  CalendarConnection,
  CalendarEvent,
  CalendarInfo,
  CalendarProvider
} from "../types";
import type { DatabaseAdapter } from "../db/adapter";
import { getDatabaseAdapter } from "../db/client";

const calendarConnections = new Map<CalendarProvider, CalendarConnection>();
const calendarsByProvider = new Map<CalendarProvider, Map<string, CalendarInfo>>();
const selectedCalendars = new Map<CalendarProvider, string>();
const eventsByCalendar = new Map<string, Map<string, CalendarEvent>>();

type CalendarSelectionRow = {
  provider: CalendarProvider;
  calendar_id: string;
  updated_at: string;
};

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const getAdapter = async (
  adapter?: DatabaseAdapter
): Promise<DatabaseAdapter> => adapter ?? getDatabaseAdapter();

const getCalendarStore = (provider: CalendarProvider): Map<string, CalendarInfo> => {
  const existing = calendarsByProvider.get(provider);
  if (existing) {
    return existing;
  }

  const next = new Map<string, CalendarInfo>();
  calendarsByProvider.set(provider, next);
  return next;
};

const getEventStore = (calendarId: string): Map<string, CalendarEvent> => {
  const existing = eventsByCalendar.get(calendarId);
  if (existing) {
    return existing;
  }

  const next = new Map<string, CalendarEvent>();
  eventsByCalendar.set(calendarId, next);
  return next;
};

export const connectCalendarProvider = (
  provider: CalendarProvider,
  connection: CalendarConnection
): void => {
  calendarConnections.set(provider, connection);
};

export const getCalendarConnection = (
  provider: CalendarProvider
): CalendarConnection | null => calendarConnections.get(provider) ?? null;

export const saveCalendar = (
  provider: CalendarProvider,
  calendar: CalendarInfo
): void => {
  const store = getCalendarStore(provider);
  store.set(calendar.id, calendar);
};

export const listCalendars = (provider: CalendarProvider): CalendarInfo[] =>
  [...getCalendarStore(provider).values()];

export const getCalendarById = (
  provider: CalendarProvider,
  calendarId: string
): CalendarInfo | null => getCalendarStore(provider).get(calendarId) ?? null;

export const setSelectedCalendar = (
  provider: CalendarProvider,
  calendarId: string,
  adapter?: DatabaseAdapter
): Promise<void> => {
  selectedCalendars.set(provider, calendarId);
  const now = new Date().toISOString();
  return getAdapter(adapter).then((db) =>
    db.execute(
      `INSERT INTO calendar_selections (
        provider,
        calendar_id,
        updated_at
      ) VALUES (
        ${escapeLiteral(provider)},
        ${escapeLiteral(calendarId)},
        ${escapeLiteral(now)}
      )
      ON CONFLICT(provider) DO UPDATE SET
        calendar_id = excluded.calendar_id,
        updated_at = excluded.updated_at`
    )
  );
};

export const getSelectedCalendarId = (
  provider: CalendarProvider,
  adapter?: DatabaseAdapter
): Promise<string | null> => {
  const cached = selectedCalendars.get(provider);
  if (cached) {
    return Promise.resolve(cached);
  }

  return getAdapter(adapter).then(async (db) => {
    const rows = await db.query<CalendarSelectionRow>(
      `SELECT provider, calendar_id, updated_at
       FROM calendar_selections
       WHERE provider = ${escapeLiteral(provider)}
       LIMIT 1`
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    selectedCalendars.set(provider, row.calendar_id);
    return row.calendar_id;
  });
};

export const saveEvent = (calendarId: string, event: CalendarEvent): void => {
  const store = getEventStore(calendarId);
  store.set(event.id, event);
};

export const getEvent = (
  calendarId: string,
  eventId: string
): CalendarEvent | null => getEventStore(calendarId).get(eventId) ?? null;

export const deleteEvent = (calendarId: string, eventId: string): boolean =>
  getEventStore(calendarId).delete(eventId);

export const listEvents = (calendarId: string): CalendarEvent[] =>
  [...getEventStore(calendarId).values()];
