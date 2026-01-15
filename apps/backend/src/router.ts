import {
  handleEmailStart,
  handleEmailVerify,
  handleOAuthStart,
  handleProviders
} from "./handlers/auth";
import {
  handleFamilyCreate,
  handleFamilyJoin,
  handleFamilyLeave
} from "./handlers/families";
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

  return notFound(pathname);
};
