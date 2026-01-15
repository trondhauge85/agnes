import type {
  CalendarConnection,
  CalendarEvent,
  CalendarInfo,
  CalendarProvider
} from "../types";

const calendarConnections = new Map<CalendarProvider, CalendarConnection>();
const calendarsByProvider = new Map<CalendarProvider, Map<string, CalendarInfo>>();
const selectedCalendars = new Map<CalendarProvider, string>();
const eventsByCalendar = new Map<string, Map<string, CalendarEvent>>();

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
  calendarId: string
): void => {
  selectedCalendars.set(provider, calendarId);
};

export const getSelectedCalendarId = (
  provider: CalendarProvider
): string | null => selectedCalendars.get(provider) ?? null;

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
