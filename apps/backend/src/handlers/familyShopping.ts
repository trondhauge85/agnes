import type { FamilyShoppingItem, FamilyShoppingItemStatus } from "../types";
import { findFamily } from "../data/families";
import {
  getFamilyShoppingItem,
  listFamilyShoppingItems,
  removeFamilyShoppingItem,
  saveFamilyShoppingItem,
  updateFamilyShoppingItem
} from "../data/familyShopping";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

type FamilyShoppingCreatePayload = {
  title: string;
  notes?: string;
  quantity?: number;
  unit?: string;
  status?: FamilyShoppingItemStatus;
};

type FamilyShoppingUpdatePayload = {
  title?: string;
  notes?: string | null;
  quantity?: number | null;
  unit?: string | null;
  status?: FamilyShoppingItemStatus;
};

const allowedStatuses: FamilyShoppingItemStatus[] = ["open", "completed"];

const normalizeStatus = (
  status: string | undefined
): FamilyShoppingItemStatus | null => {
  if (!status) {
    return null;
  }

  const normalized = normalizeString(status);
  if (!normalized) {
    return null;
  }

  if (!allowedStatuses.includes(normalized as FamilyShoppingItemStatus)) {
    return null;
  }

  return normalized as FamilyShoppingItemStatus;
};

const parseQuantity = (value: unknown): number | null | undefined => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed;
  }
  return undefined;
};

export const handleFamilyShoppingList = async (
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
    items: await listFamilyShoppingItems(familyId)
  });
};

export const handleFamilyShoppingCreate = async (
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

  const body = await parseJsonBody<FamilyShoppingCreatePayload>(request);
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
      message: "Shopping item title is required.",
      messageKey: "errors.shopping.title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  const status = normalizeStatus(body.status) ?? "open";
  if (!status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported shopping item status.",
      messageKey: "errors.shopping.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const notes = normalizeString(body.notes ?? "");
  const unit = normalizeString(body.unit ?? "");
  const quantity = parseQuantity(body.quantity);
  const now = new Date().toISOString();
  const item: FamilyShoppingItem = {
    id: crypto.randomUUID(),
    familyId,
    title,
    notes: notes || undefined,
    quantity: quantity ?? undefined,
    unit: unit || undefined,
    status,
    createdAt: now,
    updatedAt: now
  };

  await saveFamilyShoppingItem(familyId, item);

  return createJsonResponse({
    status: "created",
    item
  });
};

export const handleFamilyShoppingUpdate = async (
  request: Request,
  familyId: string,
  itemId: string
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

  const existing = await getFamilyShoppingItem(familyId, itemId);
  if (!existing) {
    return createErrorResponse({
      code: "not_found",
      message: "Shopping item not found.",
      messageKey: "errors.shopping.not_found",
      status: 404,
      details: { itemId }
    });
  }

  const body = await parseJsonBody<FamilyShoppingUpdatePayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const status = normalizeStatus(body.status ?? undefined) ?? existing.status;
  if (!status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported shopping item status.",
      messageKey: "errors.shopping.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const title = body.title !== undefined ? normalizeString(body.title ?? "") : existing.title;
  if (body.title !== undefined && !title) {
    return createErrorResponse({
      code: "bad_request",
      message: "Shopping item title is required.",
      messageKey: "errors.shopping.title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  const notes = body.notes === null ? null : normalizeString(body.notes ?? "");
  const unit = body.unit === null ? null : normalizeString(body.unit ?? "");
  const quantity = parseQuantity(body.quantity);
  const now = new Date().toISOString();

  const updated = await updateFamilyShoppingItem(
    familyId,
    itemId,
    (item) => ({
      ...item,
      title,
      notes: body.notes === undefined ? item.notes : notes || undefined,
      quantity: body.quantity === undefined ? item.quantity : quantity ?? undefined,
      unit: body.unit === undefined ? item.unit : unit || undefined,
      status,
      updatedAt: now
    })
  );

  if (!updated) {
    return createErrorResponse({
      code: "not_found",
      message: "Shopping item not found.",
      messageKey: "errors.shopping.not_found",
      status: 404,
      details: { itemId }
    });
  }

  return createJsonResponse({
    status: "updated",
    item: updated
  });
};

export const handleFamilyShoppingDelete = async (
  familyId: string,
  itemId: string
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

  const removed = await removeFamilyShoppingItem(familyId, itemId);
  if (!removed) {
    return createErrorResponse({
      code: "not_found",
      message: "Shopping item not found.",
      messageKey: "errors.shopping.not_found",
      status: 404,
      details: { itemId }
    });
  }

  return createJsonResponse({
    status: "deleted",
    item: removed
  });
};
