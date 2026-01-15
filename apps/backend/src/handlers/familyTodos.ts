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
import { createJsonResponse, parseJsonBody } from "../utils/http";
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

export const handleFamilyTodoList = async (
  familyId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  return createJsonResponse({
    familyId,
    todos: listFamilyTodos(familyId)
  });
};

export const handleFamilyTodoCreate = async (
  request: Request,
  familyId: string
): Promise<Response> => {
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyTodoCreatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const title = normalizeString(body.title ?? "");
  if (!title) {
    return createJsonResponse({ error: "Todo title is required." }, 400);
  }

  const status = normalizeTodoStatus(body.status) ?? "open";
  if (!status) {
    return createJsonResponse({ error: "Unsupported todo status." }, 400);
  }

  const { assignedToUserId, error } = normalizeAssignment(
    familyId,
    body.assignedToUserId
  );
  if (error) {
    return createJsonResponse({ error }, 400);
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

  saveFamilyTodo(familyId, todo);

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
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const existing = getFamilyTodo(familyId, todoId);
  if (!existing) {
    return createJsonResponse({ error: "Todo not found." }, 404);
  }

  const body = await parseJsonBody<FamilyTodoUpdatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const title =
    body.title === undefined ? undefined : normalizeString(body.title ?? "");
  if (title !== undefined && !title) {
    return createJsonResponse({ error: "Todo title cannot be empty." }, 400);
  }

  const status =
    body.status === undefined
      ? undefined
      : normalizeTodoStatus(body.status ?? "");
  if (body.status !== undefined && !status) {
    return createJsonResponse({ error: "Unsupported todo status." }, 400);
  }

  const assignment = normalizeAssignment(familyId, body.assignedToUserId);
  if (assignment.error) {
    return createJsonResponse({ error: assignment.error }, 400);
  }

  const notes =
    body.notes === undefined ? undefined : normalizeString(body.notes ?? "");

  const updated = updateFamilyTodo(familyId, todoId, (todo) => {
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
    return createJsonResponse({ error: "Todo not found." }, 404);
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
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const removed = removeFamilyTodo(familyId, todoId);
  if (!removed) {
    return createJsonResponse({ error: "Todo not found." }, 404);
  }

  return createJsonResponse({
    status: "deleted",
    todo: removed
  });
};
