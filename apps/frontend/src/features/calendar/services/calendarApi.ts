import { apiRequest } from "../../../shared/api";

export type CalendarProvider = string;

export type CalendarInfo = {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  primary: boolean;
  createdAt: string;
  provider: CalendarProvider;
};

export type CalendarConnection = {
  provider: CalendarProvider;
  status: "connected" | "disconnected";
  userEmail?: string;
  scopes?: string[];
  connectedAt?: string;
};

export type CalendarProvidersResponse = {
  providers: CalendarProvider[];
};

export type CalendarOAuthStartResponse = {
  status: "pending";
  provider: CalendarProvider;
  redirectUri: string;
  authUrl: string;
  state: string | null;
};

export type CalendarListResponse = {
  familyId: string;
  provider: CalendarProvider;
  calendars: CalendarInfo[];
  selectedCalendarId: string | null;
};

export type CalendarSelectResponse = {
  status: "selected";
  provider: CalendarProvider;
  familyId: string;
  calendar: CalendarInfo;
};

export const fetchCalendarProviders = async (): Promise<CalendarProvidersResponse> =>
  apiRequest<CalendarProvidersResponse>("/calendar/providers");

export const startCalendarOAuth = async (payload: {
  provider: CalendarProvider;
  redirectUri: string;
  state?: string;
}): Promise<CalendarOAuthStartResponse> =>
  apiRequest<CalendarOAuthStartResponse>("/calendar/oauth/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

export const completeCalendarOAuth = async (payload: {
  provider: CalendarProvider;
  authorizationCode: string;
  redirectUri: string;
}): Promise<{ status: string; provider: CalendarProvider; connection: CalendarConnection }> =>
  apiRequest<{ status: string; provider: CalendarProvider; connection: CalendarConnection }>(
    "/calendar/setup",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

export const fetchCalendars = async (payload: {
  provider: CalendarProvider;
  familyId: string;
}): Promise<CalendarListResponse> =>
  apiRequest<CalendarListResponse>(
    `/calendar?provider=${encodeURIComponent(payload.provider)}&familyId=${encodeURIComponent(payload.familyId)}`
  );

export const selectCalendar = async (payload: {
  provider: CalendarProvider;
  familyId: string;
  calendarId?: string;
  name?: string;
  description?: string;
  timezone?: string;
}): Promise<CalendarSelectResponse> =>
  apiRequest<CalendarSelectResponse>("/calendar/select", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
