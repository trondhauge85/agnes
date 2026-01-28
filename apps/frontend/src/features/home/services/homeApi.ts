import { apiRequest } from "../../../shared/api";

export type FamilyTodo = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  status: "open" | "completed";
  dueDate?: string;
  assignedToUserId?: string;
  assignedToUserIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type FamilyMeal = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  status: "planned" | "cooked" | "cancelled";
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  scheduledFor?: string;
  servings?: number;
  recipeUrl?: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  status: "confirmed" | "tentative" | "cancelled";
  recurrence?: string[];
  location?: {
    name?: string;
    address?: string;
    meetingUrl?: string;
  };
  participants: Array<{
    email: string;
    displayName?: string;
    status: "needs_action" | "accepted" | "declined";
    organizer?: boolean;
  }>;
  tags: string[];
};

export type ActionParseFile = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type ActionParseTodo = {
  id: string;
  title: string;
  notes?: string;
  confidence: number;
  source?: string;
};

export type ActionParseMeal = {
  id: string;
  title: string;
  notes?: string;
  mealType?: string;
  scheduledFor?: string;
  servings?: number;
  recipeUrl?: string;
  confidence: number;
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
  source?: string;
};

export type ActionParseResponse = {
  status: "parsed";
  results: {
    todos: ActionParseTodo[];
    meals: ActionParseMeal[];
    events: ActionParseEvent[];
  };
};

type FamilyTodoResponse = {
  familyId: string;
  todos: FamilyTodo[];
};

type FamilyMealResponse = {
  familyId: string;
  meals: FamilyMeal[];
};

type CalendarEventResponse = {
  familyId?: string;
  calendarId: string;
  provider: string;
  filters: Record<string, unknown>;
  events: CalendarEvent[];
};

export const fetchFamilyTodos = async (familyId: string): Promise<FamilyTodoResponse> =>
  apiRequest<FamilyTodoResponse>(`/families/${familyId}/todos`);

export const fetchFamilyMeals = async (familyId: string): Promise<FamilyMealResponse> =>
  apiRequest<FamilyMealResponse>(`/families/${familyId}/meals`);

export const parseActionableItems = async (payload: {
  text?: string;
  files?: ActionParseFile[];
  timezone?: string;
  locale?: string;
  language?: string;
}): Promise<ActionParseResponse> =>
  apiRequest<ActionParseResponse>("/actions/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

export const createFamilyTodo = async (
  familyId: string,
  payload: {
    title: string;
    notes?: string;
  }
): Promise<{ status: string; todo: FamilyTodo }> =>
  apiRequest<{ status: string; todo: FamilyTodo }>(`/families/${familyId}/todos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

export const createFamilyMeal = async (
  familyId: string,
  payload: {
    title: string;
    notes?: string;
    mealType?: string;
    scheduledFor?: string;
    servings?: number;
    recipeUrl?: string;
  }
): Promise<{ status: string; meal: FamilyMeal }> =>
  apiRequest<{ status: string; meal: FamilyMeal }>(`/families/${familyId}/meals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

export const createCalendarEvent = async (
  payload: {
    title: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    location?: {
      name?: string;
      address?: string;
      meetingUrl?: string;
    };
    recurrence?: string[];
  },
  options: {
    provider?: string;
    familyId?: string;
  } = {}
): Promise<{ status: string; event: CalendarEvent }> => {
  const params = new URLSearchParams({
    provider: options.provider ?? "google",
  });
  if (options.familyId) {
    params.set("familyId", options.familyId);
  }
  return apiRequest<{ status: string; event: CalendarEvent }>(
    `/calendar/events?${params.toString()}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
};

export const fetchCalendarEvents = async (options: {
  provider?: string;
  familyId?: string;
  start: string;
  end: string;
  limit?: number;
}): Promise<CalendarEventResponse> => {
  const provider = options.provider ?? "google";
  const params = new URLSearchParams({
    provider,
    start: options.start,
    end: options.end,
  });
  if (options.familyId) {
    params.set("familyId", options.familyId);
  }
  if (options.limit) {
    params.set("limit", options.limit.toString());
  }

  return apiRequest<CalendarEventResponse>(`/calendar/events?${params.toString()}`);
};
