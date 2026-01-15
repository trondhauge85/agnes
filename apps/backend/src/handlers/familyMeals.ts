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
import { createJsonResponse, parseJsonBody } from "../utils/http";
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
    return createJsonResponse({ error: "Family not found." }, 404);
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
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyMealCreatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const title = normalizeString(body.title ?? "");
  if (!title) {
    return createJsonResponse({ error: "Meal title is required." }, 400);
  }

  const status = normalizeMealStatus(body.status) ?? "planned";
  if (!status) {
    return createJsonResponse({ error: "Unsupported meal status." }, 400);
  }

  const mealType = normalizeMealType(body.mealType) ?? "dinner";
  if (!mealType) {
    return createJsonResponse({ error: "Unsupported meal type." }, 400);
  }

  const assignment = normalizeAssignment(familyId, body.assignedToUserId);
  if (assignment.error) {
    return createJsonResponse({ error: assignment.error }, 400);
  }

  const scheduled = normalizeScheduledFor(body.scheduledFor);
  if (scheduled.error) {
    return createJsonResponse({ error: scheduled.error }, 400);
  }

  const servings = normalizeServings(body.servings);
  if (servings.error) {
    return createJsonResponse({ error: servings.error }, 400);
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
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const existing = getFamilyMeal(familyId, mealId);
  if (!existing) {
    return createJsonResponse({ error: "Meal not found." }, 404);
  }

  const body = await parseJsonBody<FamilyMealUpdatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const title =
    body.title === undefined ? undefined : normalizeString(body.title ?? "");
  if (title !== undefined && !title) {
    return createJsonResponse({ error: "Meal title cannot be empty." }, 400);
  }

  const status =
    body.status === undefined
      ? undefined
      : normalizeMealStatus(body.status ?? "");
  if (body.status !== undefined && !status) {
    return createJsonResponse({ error: "Unsupported meal status." }, 400);
  }

  const mealType =
    body.mealType === undefined
      ? undefined
      : normalizeMealType(body.mealType ?? "");
  if (body.mealType !== undefined && !mealType) {
    return createJsonResponse({ error: "Unsupported meal type." }, 400);
  }

  const assignment = normalizeAssignment(familyId, body.assignedToUserId);
  if (assignment.error) {
    return createJsonResponse({ error: assignment.error }, 400);
  }

  const scheduled = normalizeScheduledFor(body.scheduledFor);
  if (scheduled.error) {
    return createJsonResponse({ error: scheduled.error }, 400);
  }

  const servings = normalizeServings(body.servings);
  if (servings.error) {
    return createJsonResponse({ error: servings.error }, 400);
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
    return createJsonResponse({ error: "Meal not found." }, 404);
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
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const removed = removeFamilyMeal(familyId, mealId);
  if (!removed) {
    return createJsonResponse({ error: "Meal not found." }, 404);
  }

  return createJsonResponse({
    status: "deleted",
    meal: removed
  });
};
