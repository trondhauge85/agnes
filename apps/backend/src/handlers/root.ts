import type { Runtime } from "../types";
import { createErrorResponse, createJsonResponse } from "../utils/http";

export const handleRoot = (pathname: string): Response =>
  createJsonResponse({
    name: "agnes-backend",
    runtime: "edge" satisfies Runtime,
    path: pathname,
    message: "Authentication routes are available."
  });

export const notFound = (pathname: string): Response =>
  createErrorResponse({
    code: "not_found",
    message: "Route not found.",
    messageKey: "errors.route.not_found",
    status: 404,
    details: { path: pathname }
  });
