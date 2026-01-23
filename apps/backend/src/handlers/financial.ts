import type {
  FinancialImportPayload,
  FinancialProvider
} from "../types";
import {
  listFinancialAccounts,
  listFinancialTransactions,
  storeFinancialImport
} from "../data/financial";
import {
  getFinancialProviderAdapter,
  listFinancialProviders
} from "../integrations/financialProviders";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

const ensureProvider = (provider: string): FinancialProvider | null => {
  const normalized = normalizeString(provider);
  if (!normalized) {
    return null;
  }

  const supported = listFinancialProviders();
  if (!supported.includes(normalized as FinancialProvider)) {
    return null;
  }

  return normalized as FinancialProvider;
};

const ensureUserId = (value?: string | null): string | null => {
  const normalized = normalizeString(value ?? "");
  return normalized || null;
};

export const handleFinancialProviders = (): Response =>
  createJsonResponse({ providers: listFinancialProviders() });

export const handleFinancialImport = async (
  request: Request
): Promise<Response> => {
  const body = await parseJsonBody<FinancialImportPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const provider = ensureProvider(body.provider ?? "");
  if (!provider) {
    return createErrorResponse({
      code: "bad_request",
      message: "Unsupported financial provider.",
      messageKey: "errors.financial.provider_unsupported",
      status: 400,
      details: { provider: body.provider }
    });
  }

  const userId = ensureUserId(body.userId);
  if (!userId) {
    return createErrorResponse({
      code: "bad_request",
      message: "userId is required.",
      messageKey: "errors.financial.user_required",
      status: 400,
      details: { fields: ["userId"], reason: "required" }
    });
  }

  const adapter = getFinancialProviderAdapter(provider);
  if (!adapter) {
    return createErrorResponse({
      code: "bad_request",
      message: "Financial provider is not available.",
      messageKey: "errors.financial.provider_unavailable",
      status: 400,
      details: { provider }
    });
  }

  const now = new Date().toISOString();
  const normalized = adapter.normalizeImport(body.data, { userId, now });
  const summary = storeFinancialImport(userId, normalized);

  return createJsonResponse({
    provider,
    userId,
    summary,
    counts: {
      accounts: normalized.accounts.length,
      transactions: normalized.transactions.length
    }
  });
};

export const handleFinancialAccounts = async (
  request: Request
): Promise<Response> => {
  const url = new URL(request.url);
  const userId = ensureUserId(url.searchParams.get("userId"));
  if (!userId) {
    return createErrorResponse({
      code: "bad_request",
      message: "userId is required.",
      messageKey: "errors.financial.user_required",
      status: 400,
      details: { fields: ["userId"], reason: "required" }
    });
  }

  return createJsonResponse({
    userId,
    accounts: listFinancialAccounts(userId)
  });
};

export const handleFinancialTransactions = async (
  request: Request
): Promise<Response> => {
  const url = new URL(request.url);
  const userId = ensureUserId(url.searchParams.get("userId"));
  if (!userId) {
    return createErrorResponse({
      code: "bad_request",
      message: "userId is required.",
      messageKey: "errors.financial.user_required",
      status: 400,
      details: { fields: ["userId"], reason: "required" }
    });
  }

  const accountId = ensureUserId(url.searchParams.get("accountId")) ?? undefined;

  return createJsonResponse({
    userId,
    accountId,
    transactions: listFinancialTransactions(userId, accountId)
  });
};
