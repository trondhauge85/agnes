import {
  type ApiError,
  type ApiErrorCode,
  type ApiErrorResponse,
  isApiErrorResponse
} from "@agnes/shared";
import { getSession } from "../../features/auth/services/authStorage";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export class ApiRequestError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiRequestError";
    this.apiError = apiError;
  }
}

const statusToCode = (status: number): ApiErrorCode => {
  if (status === 400) {
    return "bad_request";
  }
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not_found";
  }
  if (status === 409) {
    return "conflict";
  }
  if (status === 422) {
    return "unprocessable_entity";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status === 502) {
    return "bad_gateway";
  }
  if (status === 503) {
    return "service_unavailable";
  }
  return "internal_error";
};

const buildFallbackApiError = (
  status: number,
  message: string,
  details?: ApiError["details"]
): ApiError => {
  const code = statusToCode(status);
  return {
    code,
    message,
    messageKey: `errors.${code}`,
    status,
    details
  };
};

export const getApiErrorDescriptor = (error: unknown): ApiError => {
  if (error instanceof ApiRequestError) {
    return error.apiError;
  }

  if (error instanceof Error) {
    return buildFallbackApiError(0, error.message);
  }

  return buildFallbackApiError(0, "An unexpected error occurred.");
};

export const apiRequest = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");
  const requestUrl = baseUrl ? new URL(url, baseUrl).toString() : url;
  const session = getSession();
  const headers = new Headers(options.headers ?? {});

  if (session?.type === "token") {
    headers.set("Authorization", `Bearer ${session.value}`);
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let payload: unknown = null;
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    }

    if (isApiErrorResponse(payload)) {
      throw new ApiRequestError(payload.error);
    }

    let message = `API request failed with status ${response.status}`;
    if (typeof payload === "string" && payload.trim()) {
      message = payload;
    } else if (payload && typeof payload === "object" && "error" in payload) {
      const errorMessage = (payload as { error?: unknown }).error;
      if (typeof errorMessage === "string" && errorMessage.trim()) {
        message = errorMessage;
      }
    } else if (!contentType.includes("application/json")) {
      const responseText = await response.text().catch(() => "");
      if (responseText.trim()) {
        message = responseText;
      }
    }
    throw new ApiRequestError(
      buildFallbackApiError(response.status, message, { url: requestUrl })
    );
  }

  return (await response.json()) as T;
};
