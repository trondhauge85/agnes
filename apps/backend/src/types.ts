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
  phoneNumber?: string;
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

export type FamilyShoppingItemStatus = "open" | "completed";

export type FamilyShoppingItem = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  quantity?: number;
  unit?: string;
  status: FamilyShoppingItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type FamilyMealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FamilyMealStatus = "planned" | "cooked" | "cancelled";

export type FamilyMeal = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  status: FamilyMealStatus;
  mealType: FamilyMealType;
  scheduledFor?: string;
  servings?: number;
  recipeUrl?: string;
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
    phoneNumber?: string;
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
  phoneNumber?: string;
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

export type FamilyMealCreatePayload = {
  title: string;
  notes?: string;
  status?: FamilyMealStatus;
  mealType?: FamilyMealType;
  scheduledFor?: string;
  servings?: number;
  recipeUrl?: string;
  assignedToUserId?: string | null;
};

export type FamilyMealUpdatePayload = {
  title?: string;
  notes?: string | null;
  status?: FamilyMealStatus;
  mealType?: FamilyMealType;
  scheduledFor?: string | null;
  servings?: number | null;
  recipeUrl?: string | null;
  assignedToUserId?: string | null;
};

export type FamilyProjectStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type FamilyProjectItemType =
  | "todo"
  | "calendar_event"
  | "message"
  | "custom";

export type FamilyProjectItemLink = {
  type: FamilyProjectItemType;
  referenceId: string;
  label?: string;
  metadata?: Record<string, string>;
};

export type FamilyProjectTimeframeExtension = {
  endDate: string;
  reason?: string;
  createdAt: string;
};

export type FamilyProjectTimeframe = {
  startDate?: string;
  targetEndDate?: string;
  extensions: FamilyProjectTimeframeExtension[];
};

export type FamilyProject = {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  scope: string;
  status: FamilyProjectStatus;
  timeframe: FamilyProjectTimeframe;
  tags: string[];
  items: FamilyProjectItemLink[];
  createdAt: string;
  updatedAt: string;
};

export type FamilyProjectTimeframeCreatePayload = {
  startDate?: string;
  targetEndDate?: string;
};

export type FamilyProjectTimeframeUpdatePayload = {
  startDate?: string | null;
  targetEndDate?: string | null;
  extendTo?: string | null;
  extensionReason?: string | null;
};

export type FamilyProjectCreatePayload = {
  title: string;
  description?: string;
  scope: string;
  status?: FamilyProjectStatus;
  timeframe?: FamilyProjectTimeframeCreatePayload;
  tags?: string[];
  items?: FamilyProjectItemLink[];
};

export type FamilyProjectUpdatePayload = {
  title?: string;
  description?: string | null;
  scope?: string;
  status?: FamilyProjectStatus;
  timeframe?: FamilyProjectTimeframeUpdatePayload;
  tags?: string[] | null;
  items?: FamilyProjectItemLink[] | null;
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

export type CommunicationChannel = "sms" | "whatsapp" | "email";

export type CommunicationStatus = "pending" | "sent" | "failed";

export type CommunicationRecipient = {
  address: string;
  name?: string;
};

export type CommunicationRecord = {
  id: string;
  channel: CommunicationChannel;
  idempotencyKey: string;
  status: CommunicationStatus;
  recipients: CommunicationRecipient[];
  message: string;
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationSendPayload = {
  channel: CommunicationChannel;
  idempotencyKey: string;
  message: string;
  recipients: CommunicationRecipient[];
};

export type CommunicationProviderResult = {
  status: CommunicationStatus;
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  error?: string;
};

export type CommunicationProvider = {
  channel: CommunicationChannel;
  send: (payload: CommunicationSendPayload) => Promise<CommunicationProviderResult>;
};

export type SmsSendPayload = {
  to: string;
  message: string;
  idempotencyKey: string;
};

export type SmsSendGroupPayload = {
  to: string[];
  message: string;
  idempotencyKey: string;
};

export type SmsProviderResult = CommunicationProviderResult;

export type SmsProvider = {
  sendSms: (payload: SmsSendPayload) => Promise<SmsProviderResult>;
  sendGroupSms: (payload: SmsSendGroupPayload) => Promise<SmsProviderResult>;
};

export type FinancialProvider = "sparebanken1";

export type FinancialAccountType = "savings" | "spending" | "funds";

export type FinancialAccount = {
  id: string;
  userId: string;
  source: FinancialProvider;
  sourceId: string;
  name: string;
  type: FinancialAccountType;
  currency: string;
  balance: number;
  availableBalance?: number;
  updatedAt: string;
  createdAt: string;
};

export type FinancialTransactionStatus = "booked" | "pending";

export type FinancialTransaction = {
  id: string;
  userId: string;
  accountId: string;
  source: FinancialProvider;
  sourceId: string;
  amount: number;
  currency: string;
  description?: string;
  bookingDate: string;
  valueDate?: string;
  status: FinancialTransactionStatus;
  category?: string;
  createdAt: string;
};

export type FinancialImportPayload = {
  provider: FinancialProvider;
  userId: string;
  data: unknown;
};

export type FinancialImportResult = {
  accounts: FinancialAccount[];
  transactions: FinancialTransaction[];
};
