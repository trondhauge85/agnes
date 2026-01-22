import type {
  FamilyTodo,
  FamilyTodoCreatePayload,
  FamilyTodoStatus,
  FamilyTodoUpdatePayload
} from "../types";
import { findFamily, getMemberById } from "../data/families";
import {
  getFamilyTodo,
  listFamilyTodos,
  removeFamilyTodo,
  saveFamilyTodo,
  updateFamilyTodo
} from "../data/familyTodos";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString } from "../utils/strings";

const allowedTodoStatuses: FamilyTodoStatus[] = ["open", "completed"];

const normalizeTodoStatus = (
  status: string | undefined
): FamilyTodoStatus | null => {
  if (!status) {
    return null;
  }

  const normalized = normalizeString(status);
  if (!normalized) {
    return null;
  }

  if (!allowedTodoStatuses.includes(normalized as FamilyTodoStatus)) {
    return null;
  }

  return normalized as FamilyTodoStatus;
};

const normalizeAssignment = async (
  familyId: string,
  assignedToUserId: string | null | undefined
): Promise<{ assignedToUserId?: string; error?: string }> => {
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

  const family = await findFamily(familyId);
  if (!family) {
    return { error: "Family not found." };
  }

  const member = getMemberById(family, normalized);
  if (!member) {
    return { error: "Assigned member not found in family." };
  }

  return { assignedToUserId: member.userId };
};

export const handleFamilyTodoList = async (
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
    todos: await listFamilyTodos(familyId)
  });
};

export const handleFamilyTodoCreate = async (
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

  const body = await parseJsonBody<FamilyTodoCreatePayload>(request);
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
      message: "Todo title is required.",
      messageKey: "errors.todo.title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  const status = normalizeTodoStatus(body.status) ?? "open";
  if (!status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported todo status.",
      messageKey: "errors.todo.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const { assignedToUserId, error } = await normalizeAssignment(
    familyId,
    body.assignedToUserId
  );
  if (error) {
    const isNotFound = error === "Family not found.";
    return createErrorResponse({
      code: isNotFound ? "not_found" : "bad_request",
      message: error,
      messageKey: isNotFound
        ? "errors.family.not_found"
        : "errors.todo.assignment_invalid",
      status: isNotFound ? 404 : 400,
      details: { assignedToUserId: body.assignedToUserId ?? null }
    });
  }

  const notes = normalizeString(body.notes ?? "");
  const now = new Date().toISOString();
  const todo: FamilyTodo = {
    id: crypto.randomUUID(),
    familyId,
    title,
    notes: notes || undefined,
    status,
    assignedToUserId,
    createdAt: now,
    updatedAt: now
  };

  await saveFamilyTodo(familyId, todo);

  return createJsonResponse({
    status: "created",
    todo
  });
};

export const handleFamilyTodoUpdate = async (
  request: Request,
  familyId: string,
  todoId: string
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

  const existing = await getFamilyTodo(familyId, todoId);
  if (!existing) {
    return createErrorResponse({
      code: "not_found",
      message: "Todo not found.",
      messageKey: "errors.todo.not_found",
      status: 404,
      details: { todoId }
    });
  }

  const body = await parseJsonBody<FamilyTodoUpdatePayload>(request);
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
      message: "Todo title cannot be empty.",
      messageKey: "errors.todo.title_empty",
      status: 400,
      details: { field: "title", reason: "empty" }
    });
  }

  const status =
    body.status === undefined
      ? undefined
      : normalizeTodoStatus(body.status ?? "");
  if (body.status !== undefined && !status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported todo status.",
      messageKey: "errors.todo.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const assignment = await normalizeAssignment(familyId, body.assignedToUserId);
  if (assignment.error) {
    const isNotFound = assignment.error === "Family not found.";
    return createErrorResponse({
      code: isNotFound ? "not_found" : "bad_request",
      message: assignment.error,
      messageKey: isNotFound
        ? "errors.family.not_found"
        : "errors.todo.assignment_invalid",
      status: isNotFound ? 404 : 400,
      details: { assignedToUserId: body.assignedToUserId ?? null }
    });
  }

  const notes =
    body.notes === undefined ? undefined : normalizeString(body.notes ?? "");

  const updated = await updateFamilyTodo(familyId, todoId, (todo) => {
    const nextAssignedTo =
      body.assignedToUserId === undefined
        ? todo.assignedToUserId
        : assignment.assignedToUserId;

    return {
      ...todo,
      title: title ?? todo.title,
      notes:
        body.notes === undefined
          ? todo.notes
          : notes || undefined,
      status: status ?? todo.status,
      assignedToUserId: nextAssignedTo,
      updatedAt: new Date().toISOString()
    };
  });

  if (!updated) {
    return createErrorResponse({
      code: "not_found",
      message: "Todo not found.",
      messageKey: "errors.todo.not_found",
      status: 404,
      details: { todoId }
    });
  }

  return createJsonResponse({
    status: "updated",
    todo: updated
  });
};

export const handleFamilyTodoDelete = async (
  familyId: string,
  todoId: string
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

  const removed = await removeFamilyTodo(familyId, todoId);
  if (!removed) {
    return createErrorResponse({
      code: "not_found",
      message: "Todo not found.",
      messageKey: "errors.todo.not_found",
      status: 404,
      details: { todoId }
    });
  }

  return createJsonResponse({
    status: "deleted",
    todo: removed
  });
};
