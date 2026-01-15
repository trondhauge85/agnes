export type Runtime = "worker" | "node" | "edge";

export type OAuthProvider = "apple" | "google" | "facebook";
export type EmailAction = "login" | "signup";

export type OAuthStartPayload = {
  provider: OAuthProvider;
  redirectUri: string;
  state?: string;
};

export type EmailStartPayload = {
  email: string;
  action: EmailAction;
};

export type EmailVerifyPayload = {
  email: string;
  code: string;
};

export type FamilyRole = "owner" | "admin" | "member";

export type FamilyMember = {
  userId: string;
  displayName: string;
  role: FamilyRole;
  joinedAt: string;
};

export type FamilyMetadata = {
  interests: string[];
  goals: string[];
};

export type Family = {
  id: string;
  name: string;
  pictureUrl: string;
  createdAt: string;
  metadata: FamilyMetadata;
  members: FamilyMember[];
};

export type FamilyTodoStatus = "open" | "completed";

export type FamilyTodo = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  status: FamilyTodoStatus;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type FamilyCreatePayload = {
  name: string;
  pictureUrl: string;
  creator: {
    userId: string;
    displayName: string;
  };
  metadata?: {
    interests?: string[];
    goals?: string[];
  };
};

export type FamilyJoinPayload = {
  userId: string;
  displayName: string;
  addedByUserId: string;
};

export type FamilyLeavePayload = {
  userId: string;
};

export type FamilyTodoCreatePayload = {
  title: string;
  notes?: string;
  status?: FamilyTodoStatus;
  assignedToUserId?: string | null;
};

export type FamilyTodoUpdatePayload = {
  title?: string;
  notes?: string | null;
  status?: FamilyTodoStatus;
  assignedToUserId?: string | null;
};

export type CalendarProvider = "google";

export type CalendarConnection = {
  provider: CalendarProvider;
  status: "connected" | "disconnected";
  accessToken?: string;
  refreshToken?: string;
  scopes: string[];
  connectedAt: string;
  userEmail?: string;
};

export type CalendarInfo = {
  id: string;
  name: string;
  description?: string;
  timezone: string;
  primary: boolean;
  createdAt: string;
  provider: CalendarProvider;
};

export type CalendarParticipantStatus = "needs_action" | "accepted" | "declined";

export type CalendarParticipant = {
  email: string;
  displayName?: string;
  status: CalendarParticipantStatus;
  organizer?: boolean;
};

export type CalendarLocation = {
  name: string;
  address?: string;
  meetingUrl?: string;
};

export type CalendarEventDateTime = {
  dateTime: string;
  timeZone?: string;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  providerEventId?: string;
  title: string;
  description?: string;
  location?: CalendarLocation;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  status: "confirmed" | "tentative" | "cancelled";
  participants: CalendarParticipant[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CalendarSetupPayload = {
  provider: CalendarProvider;
  authorizationCode?: string;
  redirectUri?: string;
};

export type CalendarSelectPayload = {
  provider: CalendarProvider;
  calendarId?: string;
  name?: string;
  timezone?: string;
  description?: string;
  primary?: boolean;
};

export type CalendarEventCreatePayload = {
  title: string;
  description?: string;
  start: CalendarEventDateTime;
  end: CalendarEventDateTime;
  location?: CalendarLocation;
  participants?: CalendarParticipant[];
  status?: "confirmed" | "tentative" | "cancelled";
  tags?: string[];
};

export type CalendarEventUpdatePayload = {
  title?: string;
  description?: string;
  start?: CalendarEventDateTime;
  end?: CalendarEventDateTime;
  location?: CalendarLocation;
  participants?: CalendarParticipant[];
  status?: "confirmed" | "tentative" | "cancelled";
  tags?: string[];
};

export type CalendarEventListFilters = {
  start?: string;
  end?: string;
  participant?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  tag?: string;
  search?: string;
  limit?: number;
};
