import { apiRequest } from "../../../shared/api";

export type FamilyTodo = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  status: "open" | "completed";
  assignedToUserId?: string;
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

type FamilyTodoResponse = {
  familyId: string;
  todos: FamilyTodo[];
};

type FamilyMealResponse = {
  familyId: string;
  meals: FamilyMeal[];
};

type CalendarEventResponse = {
  calendarId: string;
  provider: string;
  filters: Record<string, unknown>;
  events: CalendarEvent[];
};

export const fetchFamilyTodos = async (familyId: string): Promise<FamilyTodoResponse> =>
  apiRequest<FamilyTodoResponse>(`/families/${familyId}/todos`);

export const fetchFamilyMeals = async (familyId: string): Promise<FamilyMealResponse> =>
  apiRequest<FamilyMealResponse>(`/families/${familyId}/meals`);

export const fetchCalendarEvents = async (options: {
  provider?: string;
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
  if (options.limit) {
    params.set("limit", options.limit.toString());
  }

  return apiRequest<CalendarEventResponse>(`/calendar/events?${params.toString()}`);
};
