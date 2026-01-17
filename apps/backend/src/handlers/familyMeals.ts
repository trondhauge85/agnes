import type {
  FamilyMeal,
  FamilyMealCreatePayload,
  FamilyMealStatus,
  FamilyMealType,
  FamilyMealUpdatePayload
} from "../types";
import { findFamily, getMemberById } from "../data/families";
import {
  getFamilyMeal,
  listFamilyMeals,
  removeFamilyMeal,
  saveFamilyMeal,
  updateFamilyMeal
} from "../data/familyMeals";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

const allowedMealStatuses: FamilyMealStatus[] = [
  "planned",
  "cooked",
  "cancelled"
];
const allowedMealTypes: FamilyMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack"
];

const normalizeMealStatus = (
  status: string | undefined
): FamilyMealStatus | null => {
  if (!status) {
    return null;
  }

  const normalized = normalizeString(status);
  if (!normalized) {
    return null;
  }

  if (!allowedMealStatuses.includes(normalized as FamilyMealStatus)) {
    return null;
  }

  return normalized as FamilyMealStatus;
};

const normalizeMealType = (
  mealType: string | undefined
): FamilyMealType | null => {
  if (!mealType) {
    return null;
  }

  const normalized = normalizeString(mealType);
  if (!normalized) {
    return null;
  }

  if (!allowedMealTypes.includes(normalized as FamilyMealType)) {
    return null;
  }

  return normalized as FamilyMealType;
};

const normalizeAssignment = (
  familyId: string,
  assignedToUserId: string | null | undefined
): { assignedToUserId?: string; error?: string } => {
  if (assignedToUserId === undefined) {
    return {};
  }

  if (assignedToUserId === null) {
    return { assignedToUserId: undefined };
  }

  const normalized = normalizeString(assignedToUserId);
  if (!normalized) {
    return { assignedToUserId: undefined };
  }

  const family = findFamily(familyId);
  if (!family) {
    return { error: "Family not found." };
  }

  const member = getMemberById(family, normalized);
  if (!member) {
    return { error: "Assigned member not found in family." };
  }

  return { assignedToUserId: member.userId };
};

const normalizeScheduledFor = (
  scheduledFor: string | null | undefined
): { scheduledFor?: string; error?: string } => {
  if (scheduledFor === undefined) {
    return {};
  }

  if (scheduledFor === null) {
    return { scheduledFor: undefined };
  }

  const normalized = normalizeString(scheduledFor);
  if (!normalized) {
    return { scheduledFor: undefined };
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Scheduled date must be a valid ISO timestamp." };
  }

  return { scheduledFor: parsed.toISOString() };
};

const normalizeServings = (
  servings: number | null | undefined
): { servings?: number; error?: string } => {
  if (servings === undefined) {
    return {};
  }

  if (servings === null) {
    return { servings: undefined };
  }

  if (!Number.isFinite(servings) || servings <= 0) {
    return { error: "Servings must be a positive number." };
  }

  return { servings };
};

export const handleFamilyMealList = async (
  familyId: string
): Promise<Response> => {
  const family = findFamily(familyId);
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
    meals: listFamilyMeals(familyId)
  });
};

export const handleFamilyMealCreate = async (
  request: Request,
  familyId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  const body = await parseJsonBody<FamilyMealCreatePayload>(request);
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
      message: "Meal title is required.",
      messageKey: "errors.meal.title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  const status = normalizeMealStatus(body.status) ?? "planned";
  if (!status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported meal status.",
      messageKey: "errors.meal.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const mealType = normalizeMealType(body.mealType) ?? "dinner";
  if (!mealType) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported meal type.",
      messageKey: "errors.meal.type_unsupported",
      status: 422,
      details: { field: "mealType", reason: "unsupported" }
    });
  }

  const assignment = normalizeAssignment(familyId, body.assignedToUserId);
  if (assignment.error) {
    const isNotFound = assignment.error === "Family not found.";
    return createErrorResponse({
      code: isNotFound ? "not_found" : "bad_request",
      message: assignment.error,
      messageKey: isNotFound
        ? "errors.family.not_found"
        : "errors.meal.assignment_invalid",
      status: isNotFound ? 404 : 400,
      details: { assignedToUserId: body.assignedToUserId ?? null }
    });
  }

  const scheduled = normalizeScheduledFor(body.scheduledFor);
  if (scheduled.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: scheduled.error,
      messageKey: "errors.meal.schedule_invalid",
      status: 422,
      details: { field: "scheduledFor", reason: "format" }
    });
  }

  const servings = normalizeServings(body.servings);
  if (servings.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: servings.error,
      messageKey: "errors.meal.servings_invalid",
      status: 422,
      details: { field: "servings", reason: "range" }
    });
  }

  const notes = normalizeString(body.notes ?? "");
  const recipeUrl = normalizeString(body.recipeUrl ?? "");
  const now = new Date().toISOString();
  const meal: FamilyMeal = {
    id: crypto.randomUUID(),
    familyId,
    title,
    notes: notes || undefined,
    status,
    mealType,
    scheduledFor: scheduled.scheduledFor,
    servings: servings.servings,
    recipeUrl: recipeUrl || undefined,
    assignedToUserId: assignment.assignedToUserId,
    createdAt: now,
    updatedAt: now
  };

  saveFamilyMeal(familyId, meal);

  return createJsonResponse({
    status: "created",
    meal
  });
};

export const handleFamilyMealUpdate = async (
  request: Request,
  familyId: string,
  mealId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  const existing = getFamilyMeal(familyId, mealId);
  if (!existing) {
    return createErrorResponse({
      code: "not_found",
      message: "Meal not found.",
      messageKey: "errors.meal.not_found",
      status: 404,
      details: { mealId }
    });
  }

  const body = await parseJsonBody<FamilyMealUpdatePayload>(request);
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
      message: "Meal title cannot be empty.",
      messageKey: "errors.meal.title_empty",
      status: 400,
      details: { field: "title", reason: "empty" }
    });
  }

  const status =
    body.status === undefined
      ? undefined
      : normalizeMealStatus(body.status ?? "");
  if (body.status !== undefined && !status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported meal status.",
      messageKey: "errors.meal.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const mealType =
    body.mealType === undefined
      ? undefined
      : normalizeMealType(body.mealType ?? "");
  if (body.mealType !== undefined && !mealType) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported meal type.",
      messageKey: "errors.meal.type_unsupported",
      status: 422,
      details: { field: "mealType", reason: "unsupported" }
    });
  }

  const assignment = normalizeAssignment(familyId, body.assignedToUserId);
  if (assignment.error) {
    const isNotFound = assignment.error === "Family not found.";
    return createErrorResponse({
      code: isNotFound ? "not_found" : "bad_request",
      message: assignment.error,
      messageKey: isNotFound
        ? "errors.family.not_found"
        : "errors.meal.assignment_invalid",
      status: isNotFound ? 404 : 400,
      details: { assignedToUserId: body.assignedToUserId ?? null }
    });
  }

  const scheduled = normalizeScheduledFor(body.scheduledFor);
  if (scheduled.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: scheduled.error,
      messageKey: "errors.meal.schedule_invalid",
      status: 422,
      details: { field: "scheduledFor", reason: "format" }
    });
  }

  const servings = normalizeServings(body.servings);
  if (servings.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: servings.error,
      messageKey: "errors.meal.servings_invalid",
      status: 422,
      details: { field: "servings", reason: "range" }
    });
  }

  const notes =
    body.notes === undefined ? undefined : normalizeString(body.notes ?? "");
  const recipeUrl =
    body.recipeUrl === undefined
      ? undefined
      : normalizeString(body.recipeUrl ?? "");

  const updated = updateFamilyMeal(familyId, mealId, (meal) => {
    const nextAssignedTo =
      body.assignedToUserId === undefined
        ? meal.assignedToUserId
        : assignment.assignedToUserId;

    return {
      ...meal,
      title: title ?? meal.title,
      notes:
        body.notes === undefined
          ? meal.notes
          : notes || undefined,
      status: status ?? meal.status,
      mealType: mealType ?? meal.mealType,
      scheduledFor:
        body.scheduledFor === undefined
          ? meal.scheduledFor
          : scheduled.scheduledFor,
      servings:
        body.servings === undefined
          ? meal.servings
          : servings.servings,
      recipeUrl:
        body.recipeUrl === undefined
          ? meal.recipeUrl
          : recipeUrl || undefined,
      assignedToUserId: nextAssignedTo,
      updatedAt: new Date().toISOString()
    };
  });

  if (!updated) {
    return createErrorResponse({
      code: "not_found",
      message: "Meal not found.",
      messageKey: "errors.meal.not_found",
      status: 404,
      details: { mealId }
    });
  }

  return createJsonResponse({
    status: "updated",
    meal: updated
  });
};

export const handleFamilyMealDelete = async (
  familyId: string,
  mealId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createErrorResponse({
      code: "not_found",
      message: "Family not found.",
      messageKey: "errors.family.not_found",
      status: 404,
      details: { familyId }
    });
  }

  const removed = removeFamilyMeal(familyId, mealId);
  if (!removed) {
    return createErrorResponse({
      code: "not_found",
      message: "Meal not found.",
      messageKey: "errors.meal.not_found",
      status: 404,
      details: { mealId }
    });
  }

  return createJsonResponse({
    status: "deleted",
    meal: removed
  });
};
