import type {
  FamilyBudget,
  FamilyBudgetCreatePayload,
  FamilyBudgetUpdatePayload
} from "../types";
import { findFamily } from "../data/families";
import {
  getFamilyBudget,
  listFamilyBudgets,
  removeFamilyBudget,
  saveFamilyBudget,
  updateFamilyBudget
} from "../data/familyBudgets";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString, normalizeStringArray } from "../utils/strings";

type AmountParseResult = {
  value?: number;
  error?: string;
  errorCode?: "required" | "invalid";
};

const parseBudgetAmount = (
  value: unknown,
  label: string,
  required: boolean
): AmountParseResult => {
  if (value === undefined) {
    if (required) {
      return { error: `${label} is required.`, errorCode: "required" };
    }
    return {};
  }

  if (value === null) {
    return {
      error: `${label} must be a valid non-negative number.`,
      errorCode: "invalid"
    };
  }

  let parsed: number | null = null;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    const next = Number.parseFloat(value);
    if (!Number.isNaN(next)) {
      parsed = next;
    }
  }

  if (parsed === null || !Number.isFinite(parsed)) {
    return {
      error: `${label} must be a valid non-negative number.`,
      errorCode: "invalid"
    };
  }

  if (parsed < 0) {
    return {
      error: `${label} must be a non-negative number.`,
      errorCode: "invalid"
    };
  }

  return { value: parsed };
};

export const handleFamilyBudgetList = async (
  familyId: string
): Promise<Response> => {
  const family = await findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  return createJsonResponse({
    familyId,
    budgets: listFamilyBudgets(familyId)
  });
};

export const handleFamilyBudgetCreate = async (
  request: Request,
  familyId: string
): Promise<Response> => {
  const family = await findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  const body = await parseJsonBody<FamilyBudgetCreatePayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const title = normalizeString(body.title ?? "");
  if (!title) {
    return createErrorResponse({
      code: "bad_request",
      message: "Budget title is required.",
      messageKey: "errors.budget.title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  const estimatedResult = parseBudgetAmount(
    body.estimatedExpenses,
    "Estimated expenses",
    true
  );
  if (estimatedResult.error) {
    return createErrorResponse({
      code: estimatedResult.errorCode === "required" ? "bad_request" : "unprocessable_entity",
      message: estimatedResult.error,
      messageKey:
        estimatedResult.errorCode === "required"
          ? "errors.budget.estimated_required"
          : "errors.budget.estimated_invalid",
      status: estimatedResult.errorCode === "required" ? 400 : 422,
      details: { field: "estimatedExpenses", reason: estimatedResult.errorCode }
    });
  }

  const actualResult = parseBudgetAmount(body.actualExpenses, "Actual expenses", true);
  if (actualResult.error) {
    return createErrorResponse({
      code: actualResult.errorCode === "required" ? "bad_request" : "unprocessable_entity",
      message: actualResult.error,
      messageKey:
        actualResult.errorCode === "required"
          ? "errors.budget.actual_required"
          : "errors.budget.actual_invalid",
      status: actualResult.errorCode === "required" ? 400 : 422,
      details: { field: "actualExpenses", reason: actualResult.errorCode }
    });
  }

  const description = normalizeString(body.description ?? "");
  const tags = normalizeStringArray(body.tags);
  const now = new Date().toISOString();

  const budget: FamilyBudget = {
    id: crypto.randomUUID(),
    familyId,
    title,
    description: description || undefined,
    tags,
    estimatedExpenses: estimatedResult.value ?? 0,
    actualExpenses: actualResult.value ?? 0,
    createdAt: now,
    updatedAt: now
  };

  saveFamilyBudget(familyId, budget);

  return createJsonResponse({
    status: "created",
    budget
  });
};

export const handleFamilyBudgetUpdate = async (
  request: Request,
  familyId: string,
  budgetId: string
): Promise<Response> => {
  const family = await findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  const existing = await getFamilyBudget(familyId, budgetId);
  if (!existing) {
    return createErrorResponse({
      code: "not_found",
      message: "Budget not found.",
      messageKey: "errors.budget.not_found",
      status: 404,
      details: { budgetId }
    });
  }

  const body = await parseJsonBody<FamilyBudgetUpdatePayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const title =
    body.title === undefined ? undefined : normalizeString(body.title ?? "");
  if (title !== undefined && !title) {
    return createErrorResponse({
      code: "bad_request",
      message: "Budget title cannot be empty.",
      messageKey: "errors.budget.title_empty",
      status: 400,
      details: { field: "title", reason: "empty" }
    });
  }

  const description =
    body.description === undefined
      ? undefined
      : normalizeString(body.description ?? "");

  const tags =
    body.tags === undefined
      ? undefined
      : body.tags === null
        ? []
        : normalizeStringArray(body.tags);

  const estimatedResult = parseBudgetAmount(
    body.estimatedExpenses,
    "Estimated expenses",
    false
  );
  if (estimatedResult.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: estimatedResult.error,
      messageKey: "errors.budget.estimated_invalid",
      status: 422,
      details: { field: "estimatedExpenses", reason: estimatedResult.errorCode }
    });
  }

  const actualResult = parseBudgetAmount(body.actualExpenses, "Actual expenses", false);
  if (actualResult.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: actualResult.error,
      messageKey: "errors.budget.actual_invalid",
      status: 422,
      details: { field: "actualExpenses", reason: actualResult.errorCode }
    });
  }

  const updated = updateFamilyBudget(familyId, budgetId, (budget) => ({
    ...budget,
    title: title ?? budget.title,
    description:
      body.description === undefined ? budget.description : description || undefined,
    tags: tags ?? budget.tags,
    estimatedExpenses: estimatedResult.value ?? budget.estimatedExpenses,
    actualExpenses: actualResult.value ?? budget.actualExpenses,
    updatedAt: new Date().toISOString()
  }));

  if (!updated) {
    return createErrorResponse({
      code: "not_found",
      message: "Budget not found.",
      messageKey: "errors.budget.not_found",
      status: 404,
      details: { budgetId }
    });
  }

  return createJsonResponse({
    status: "updated",
    budget: updated
  });
};

export const handleFamilyBudgetDelete = async (
  familyId: string,
  budgetId: string
): Promise<Response> => {
  const family = await findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  const removed = removeFamilyBudget(familyId, budgetId);
  if (!removed) {
    return createErrorResponse({
      code: "not_found",
      message: "Budget not found.",
      messageKey: "errors.budget.not_found",
      status: 404,
      details: { budgetId }
    });
  }

  return createJsonResponse({
    status: "deleted",
    budget: removed
  });
};
