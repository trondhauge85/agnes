import type { Runtime } from "../types";
import { createJsonResponse } from "../utils/http";

export const handleRoot = (pathname: string): Response =>
  createJsonResponse({
    name: "agnes-backend",
    runtime: "edge" satisfies Runtime,
    path: pathname,
    message: "Authentication routes are available."
  });

export const notFound = (pathname: string): Response =>
  createJsonResponse(
    {
      error: "Route not found.",
      path: pathname
    },
    404
  );
