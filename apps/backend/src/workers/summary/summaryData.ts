import type {
  CalendarEvent,
  CalendarProvider,
  FamilyMeal,
  FamilyShoppingItem,
  FamilyTodo
} from "../../types";
import { getSelectedCalendarId, listEvents } from "../../data/calendar";
import { listFamilyMeals } from "../../data/familyMeals";
import { listFamilyShoppingItems } from "../../data/familyShopping";
import { listFamilyTodos } from "../../data/familyTodos";
import type { SummaryPeriod } from "./summaryPeriods";

export type FamilySummaryData = {
  todos: FamilyTodo[];
  meals: FamilyMeal[];
  shoppingList: FamilyShoppingItem[];
  events: CalendarEvent[];
};

type SummaryDataDependencies = {
  listTodos?: typeof listFamilyTodos;
  listMeals?: typeof listFamilyMeals;
  listShoppingItems?: typeof listFamilyShoppingItems;
  listEvents?: typeof listEvents;
  getSelectedCalendarId?: typeof getSelectedCalendarId;
  calendarProvider?: CalendarProvider;
};

const isWithinRange = (value: string | undefined, period: SummaryPeriod): boolean => {
  if (!value) {
    return false;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp >= period.start.getTime() && timestamp <= period.end.getTime();
};

const overlapsPeriod = (event: CalendarEvent, period: SummaryPeriod): boolean => {
  const start = Date.parse(event.start.dateTime);
  const end = Date.parse(event.end.dateTime);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return false;
  }
  return start <= period.end.getTime() && end >= period.start.getTime();
};

export const createFamilySummaryDataFetcher = (
  deps: SummaryDataDependencies = {}
) => {
  const {
    listTodos = listFamilyTodos,
    listMeals = listFamilyMeals,
    listShoppingItems = listFamilyShoppingItems,
    listEvents: listCalendarEvents = listEvents,
    getSelectedCalendarId: getSelectedCalendar = getSelectedCalendarId,
    calendarProvider = "google"
  } = deps;

  return async (
    familyId: string,
    period: SummaryPeriod
  ): Promise<FamilySummaryData> => {
    const todos = (await listTodos(familyId)).filter(
      (todo) => todo.status === "open"
    );
    const meals = (await listMeals(familyId)).filter((meal) =>
      isWithinRange(meal.scheduledFor, period)
    );
    const shoppingList = (await listShoppingItems(familyId)).filter(
      (item) => item.status === "open"
    );

    const calendarId = await getSelectedCalendar(calendarProvider, familyId);
    const events = calendarId
      ? listCalendarEvents(calendarId).filter((event) =>
          overlapsPeriod(event, period)
        )
      : [];

    return { todos, meals, shoppingList, events };
  };
};
