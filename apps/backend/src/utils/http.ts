import type { ApiError, ApiErrorCode, ApiErrorDetails, ApiErrorResponse } from "@agnes/shared";

export const jsonHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json"
};

export const createJsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: jsonHeaders
  });

type CreateApiErrorOptions = {
  code: ApiErrorCode;
  message: string;
  status: number;
  messageKey?: string;
  details?: ApiErrorDetails;
};

export const createApiError = ({
  code,
  message,
  status,
  messageKey,
  details
}: CreateApiErrorOptions): ApiError => ({
  code,
  message,
  messageKey: messageKey ?? `errors.${code}`,
  status,
  details
});

export const createErrorResponse = (options: CreateApiErrorOptions): Response =>
  createJsonResponse(
    { error: createApiError(options) } satisfies ApiErrorResponse,
    options.status
  );

export const parseJsonBody = async <T>(
  request: Request
): Promise<T | null> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await request.json()) as T;
};
