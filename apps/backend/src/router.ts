import {
  handleEmailStart,
  handleEmailVerify,
  handleOAuthStart,
  handleProviders
} from "./handlers/auth";
import {
  handleCalendarEventCreate,
  handleCalendarEventDelete,
  handleCalendarEventList,
  handleCalendarEventUpdate,
  handleCalendarList,
  handleCalendarProviders,
  handleCalendarSelect,
  handleCalendarSetup
} from "./handlers/calendar";
import {
  handleFamilyCreate,
  handleFamilyJoin,
  handleFamilyLeave
} from "./handlers/families";
import {
  handleFamilyTodoCreate,
  handleFamilyTodoDelete,
  handleFamilyTodoList,
  handleFamilyTodoUpdate
} from "./handlers/familyTodos";
import { handleRoot, notFound } from "./handlers/root";

export const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/") {
    return handleRoot(pathname);
  }

  if (request.method === "GET" && pathname === "/auth/providers") {
    return handleProviders();
  }

  if (request.method === "POST" && pathname === "/auth/oauth/start") {
    return handleOAuthStart(request);
  }

  if (request.method === "POST" && pathname === "/auth/email/start") {
    return handleEmailStart(request);
  }

  if (request.method === "POST" && pathname === "/auth/email/verify") {
    return handleEmailVerify(request);
  }

  if (request.method === "GET" && pathname === "/calendar/providers") {
    return handleCalendarProviders();
  }

  if (request.method === "POST" && pathname === "/calendar/setup") {
    return handleCalendarSetup(request);
  }

  if (request.method === "GET" && pathname === "/calendar") {
    return handleCalendarList(request);
  }

  if (request.method === "POST" && pathname === "/calendar/select") {
    return handleCalendarSelect(request);
  }

  if (request.method === "GET" && pathname === "/calendar/events") {
    return handleCalendarEventList(request);
  }

  if (request.method === "POST" && pathname === "/calendar/events") {
    return handleCalendarEventCreate(request);
  }

  const calendarEventMatch = pathname.match(/^\/calendar\/events\/([^/]+)$/);
  if (calendarEventMatch) {
    if (request.method === "PATCH") {
      return handleCalendarEventUpdate(request, calendarEventMatch[1]);
    }

    if (request.method === "DELETE") {
      return handleCalendarEventDelete(request, calendarEventMatch[1]);
    }
  }

  if (request.method === "POST" && pathname === "/families") {
    return handleFamilyCreate(request);
  }

  const familyJoinMatch = pathname.match(/^\/families\/([^/]+)\/join$/);
  if (request.method === "POST" && familyJoinMatch) {
    return handleFamilyJoin(request, familyJoinMatch[1]);
  }

  const familyLeaveMatch = pathname.match(/^\/families\/([^/]+)\/leave$/);
  if (request.method === "POST" && familyLeaveMatch) {
    return handleFamilyLeave(request, familyLeaveMatch[1]);
  }

  const familyTodosMatch = pathname.match(/^\/families\/([^/]+)\/todos$/);
  if (familyTodosMatch) {
    if (request.method === "GET") {
      return handleFamilyTodoList(familyTodosMatch[1]);
    }
    if (request.method === "POST") {
      return handleFamilyTodoCreate(request, familyTodosMatch[1]);
    }
  }

  const familyTodoMatch = pathname.match(
    /^\/families\/([^/]+)\/todos\/([^/]+)$/
  );
  if (familyTodoMatch) {
    if (request.method === "PATCH") {
      return handleFamilyTodoUpdate(
        request,
        familyTodoMatch[1],
        familyTodoMatch[2]
      );
    }
    if (request.method === "DELETE") {
      return handleFamilyTodoDelete(familyTodoMatch[1], familyTodoMatch[2]);
    }
  }

  return notFound(pathname);
};
