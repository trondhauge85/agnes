export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable_entity"
  | "rate_limited"
  | "internal_error"
  | "bad_gateway"
  | "service_unavailable";

export type ApiErrorDetails = Record<string, unknown>;

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  messageKey: string;
  status: number;
  details?: ApiErrorDetails;
};

export type ApiErrorResponse = {
  error: ApiError;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (!isRecord(value)) {
    return false;
  }

  const error = value.error;
  if (!isRecord(error)) {
    return false;
  }

  return (
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.messageKey === "string" &&
    typeof error.status === "number"
  );
};
