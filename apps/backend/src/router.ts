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

  const withCors = (response: Response): Response => {
    const headers = new Headers(response.headers);
    const origin = request.headers.get("origin");

    if (origin) {
      headers.set("access-control-allow-origin", origin);
      headers.set("access-control-allow-credentials", "true");
      const vary = headers.get("vary");
      headers.set("vary", vary ? `${vary}, Origin` : "Origin");
    } else {
      headers.set("access-control-allow-origin", "*");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };

  if (request.method === "OPTIONS") {
    const headers = new Headers();
    const origin = request.headers.get("origin");
    const requestHeaders = request.headers.get("access-control-request-headers");

    if (origin) {
      headers.set("access-control-allow-origin", origin);
      headers.set("access-control-allow-credentials", "true");
      headers.set("vary", "Origin");
    } else {
      headers.set("access-control-allow-origin", "*");
    }

    headers.set(
      "access-control-allow-methods",
      "GET,POST,PATCH,DELETE,OPTIONS"
    );
    headers.set(
      "access-control-allow-headers",
      requestHeaders ?? "authorization,content-type"
    );
    headers.set("access-control-max-age", "86400");

    return new Response(null, { status: 204, headers });
  }

  logger.info("request.received", {
    data: {
      method: request.method,
      pathname
    }
  });

  if (request.method === "GET" && pathname === "/") {
    return withCors(handleRoot(pathname));
  }

  if (request.method === "GET" && pathname === "/auth/providers") {
    return withCors(handleProviders());
  }

  if (request.method === "POST" && pathname === "/auth/oauth/start") {
    return withCors(await handleOAuthStart(request));
  }

  if (request.method === "POST" && pathname === "/auth/email/start") {
    return withCors(await handleEmailStart(request));
  }

  if (request.method === "POST" && pathname === "/auth/email/verify") {
    return withCors(await handleEmailVerify(request));
  }

  if (request.method === "POST" && pathname === "/auth/oidc/callback") {
    return withCors(await handleOidcCallback(request));
  }

  if (request.method === "GET" && pathname === "/auth/oidc/profile") {
    return withCors(await handleOidcProfile(request));
  }

  if (request.method === "GET" && pathname === "/calendar/providers") {
    return withCors(handleCalendarProviders());
  }

  if (request.method === "POST" && pathname === "/calendar/setup") {
    return withCors(await handleCalendarSetup(request));
  }

  if (request.method === "GET" && pathname === "/calendar") {
    return withCors(await handleCalendarList(request));
  }

  if (request.method === "POST" && pathname === "/calendar/select") {
    return withCors(await handleCalendarSelect(request));
  }

  if (request.method === "GET" && pathname === "/calendar/events") {
    return withCors(await handleCalendarEventList(request));
  }

  if (request.method === "POST" && pathname === "/calendar/events") {
    return withCors(await handleCalendarEventCreate(request));
  }

  const calendarEventMatch = pathname.match(/^\/calendar\/events\/([^/]+)$/);
  if (calendarEventMatch) {
    if (request.method === "PATCH") {
      return withCors(
        await handleCalendarEventUpdate(request, calendarEventMatch[1])
      );
    }

    if (request.method === "DELETE") {
      return withCors(
        await handleCalendarEventDelete(request, calendarEventMatch[1])
      );
    }
  }

  if (request.method === "GET" && pathname === "/finance/providers") {
    return withCors(handleFinancialProviders());
  }

  if (request.method === "POST" && pathname === "/finance/import") {
    return withCors(await handleFinancialImport(request));
  }

  if (request.method === "GET" && pathname === "/finance/accounts") {
    return withCors(await handleFinancialAccounts(request));
  }

  if (request.method === "GET" && pathname === "/finance/transactions") {
    return withCors(await handleFinancialTransactions(request));
  }

  if (request.method === "POST" && pathname === "/actions/parse") {
    return withCors(await handleActionParse(request));
  }

  if (request.method === "POST" && pathname === "/families") {
    return withCors(await handleFamilyCreate(request));
  }

  const familyJoinMatch = pathname.match(/^\/families\/([^/]+)\/join$/);
  if (request.method === "POST" && familyJoinMatch) {
    return withCors(await handleFamilyJoin(request, familyJoinMatch[1]));
  }

  const familyLeaveMatch = pathname.match(/^\/families\/([^/]+)\/leave$/);
  if (request.method === "POST" && familyLeaveMatch) {
    return withCors(await handleFamilyLeave(request, familyLeaveMatch[1]));
  }

  const familyTodosMatch = pathname.match(/^\/families\/([^/]+)\/todos$/);
  if (familyTodosMatch) {
    if (request.method === "GET") {
      return withCors(await handleFamilyTodoList(familyTodosMatch[1]));
    }
    if (request.method === "POST") {
      return withCors(
        await handleFamilyTodoCreate(request, familyTodosMatch[1])
      );
    }
  }

  const familyMealsMatch = pathname.match(/^\/families\/([^/]+)\/meals$/);
  if (familyMealsMatch) {
    if (request.method === "GET") {
      return withCors(await handleFamilyMealList(familyMealsMatch[1]));
    }
    if (request.method === "POST") {
      return withCors(
        await handleFamilyMealCreate(request, familyMealsMatch[1])
      );
    }
  }

  const familyProjectsMatch = pathname.match(/^\/families\/([^/]+)\/projects$/);
  if (familyProjectsMatch) {
    if (request.method === "GET") {
      return withCors(await handleFamilyProjectList(familyProjectsMatch[1]));
    }
    if (request.method === "POST") {
      return withCors(
        await handleFamilyProjectCreate(request, familyProjectsMatch[1])
      );
    }
  }

  const familyTodoMatch = pathname.match(
    /^\/families\/([^/]+)\/todos\/([^/]+)$/
  );
  if (familyTodoMatch) {
    if (request.method === "PATCH") {
      return withCors(
        await handleFamilyTodoUpdate(
          request,
          familyTodoMatch[1],
          familyTodoMatch[2]
        )
      );
    }
    if (request.method === "DELETE") {
      return withCors(
        await handleFamilyTodoDelete(familyTodoMatch[1], familyTodoMatch[2])
      );
    }
  }

  const familyProjectMatch = pathname.match(
    /^\/families\/([^/]+)\/projects\/([^/]+)$/
  );
  if (familyProjectMatch) {
    if (request.method === "PATCH") {
      return withCors(
        await handleFamilyProjectUpdate(
          request,
          familyProjectMatch[1],
          familyProjectMatch[2]
        )
      );
    }
    if (request.method === "DELETE") {
      return withCors(
        await handleFamilyProjectDelete(
          familyProjectMatch[1],
          familyProjectMatch[2]
        )
      );
    }
  }

  const familyMealMatch = pathname.match(
    /^\/families\/([^/]+)\/meals\/([^/]+)$/
  );
  if (familyMealMatch) {
    if (request.method === "PATCH") {
      return withCors(
        await handleFamilyMealUpdate(
          request,
          familyMealMatch[1],
          familyMealMatch[2]
        )
      );
    }
    if (request.method === "DELETE") {
      return withCors(
        await handleFamilyMealDelete(familyMealMatch[1], familyMealMatch[2])
      );
    }
  }

  logger.warn("request.not_found", {
    data: {
      method: request.method,
      pathname
    }
  });

  return withCors(notFound(pathname));
};
