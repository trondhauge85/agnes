import {
  handleEmailStart,
  handleEmailVerify,
  handleOAuthStart,
  handleOidcCallback,
  handleOidcProfile,
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
import {
  handleFamilyMealCreate,
  handleFamilyMealDelete,
  handleFamilyMealList,
  handleFamilyMealUpdate
} from "./handlers/familyMeals";
import {
  handleFamilyProjectCreate,
  handleFamilyProjectDelete,
  handleFamilyProjectList,
  handleFamilyProjectUpdate
} from "./handlers/familyProjects";
import {
  handleFinancialAccounts,
  handleFinancialImport,
  handleFinancialProviders,
  handleFinancialTransactions
} from "./handlers/financial";
import { handleActionParse } from "./handlers/actionParsing";
import { handleRoot, notFound } from "./handlers/root";
import { configureLogging, createLogger } from "@agnes/shared";

configureLogging({ level: "info", context: { service: "backend" } });
const logger = createLogger("router");

export const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const { pathname } = url;

  logger.info("request.received", {
    data: {
      method: request.method,
      pathname
    }
  });

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

  if (request.method === "POST" && pathname === "/auth/oidc/callback") {
    return handleOidcCallback(request);
  }

  if (request.method === "GET" && pathname === "/auth/oidc/profile") {
    return handleOidcProfile(request);
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

  if (request.method === "GET" && pathname === "/finance/providers") {
    return handleFinancialProviders();
  }

  if (request.method === "POST" && pathname === "/finance/import") {
    return handleFinancialImport(request);
  }

  if (request.method === "GET" && pathname === "/finance/accounts") {
    return handleFinancialAccounts(request);
  }

  if (request.method === "GET" && pathname === "/finance/transactions") {
    return handleFinancialTransactions(request);
  }

  if (request.method === "POST" && pathname === "/actions/parse") {
    return handleActionParse(request);
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

  const familyMealsMatch = pathname.match(/^\/families\/([^/]+)\/meals$/);
  if (familyMealsMatch) {
    if (request.method === "GET") {
      return handleFamilyMealList(familyMealsMatch[1]);
    }
    if (request.method === "POST") {
      return handleFamilyMealCreate(request, familyMealsMatch[1]);
    }
  }

  const familyProjectsMatch = pathname.match(/^\/families\/([^/]+)\/projects$/);
  if (familyProjectsMatch) {
    if (request.method === "GET") {
      return handleFamilyProjectList(familyProjectsMatch[1]);
    }
    if (request.method === "POST") {
      return handleFamilyProjectCreate(request, familyProjectsMatch[1]);
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

  const familyProjectMatch = pathname.match(
    /^\/families\/([^/]+)\/projects\/([^/]+)$/
  );
  if (familyProjectMatch) {
    if (request.method === "PATCH") {
      return handleFamilyProjectUpdate(
        request,
        familyProjectMatch[1],
        familyProjectMatch[2]
      );
    }
    if (request.method === "DELETE") {
      return handleFamilyProjectDelete(
        familyProjectMatch[1],
        familyProjectMatch[2]
      );
    }
  }

  const familyMealMatch = pathname.match(
    /^\/families\/([^/]+)\/meals\/([^/]+)$/
  );
  if (familyMealMatch) {
    if (request.method === "PATCH") {
      return handleFamilyMealUpdate(
        request,
        familyMealMatch[1],
        familyMealMatch[2]
      );
    }
    if (request.method === "DELETE") {
      return handleFamilyMealDelete(familyMealMatch[1], familyMealMatch[2]);
    }
  }

  logger.warn("request.not_found", {
    data: {
      method: request.method,
      pathname
    }
  });

  return notFound(pathname);
};
