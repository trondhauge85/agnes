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

type FamilyContext = NonNullable<Awaited<ReturnType<typeof findFamily>>>;

const normalizeAssignments = (
  family: FamilyContext,
  assignedToUserIds: unknown,
  assignedToUserId: string | null | undefined
): { assignedToUserIds?: string[]; assignedToUserId?: string; error?: string } => {
  if (assignedToUserIds === undefined && assignedToUserId === undefined) {
    return {};
  }

  if (assignedToUserIds !== undefined) {
    if (assignedToUserIds === null) {
      return { assignedToUserIds: [], assignedToUserId: undefined };
    }

    if (!Array.isArray(assignedToUserIds)) {
      return { error: "Assigned members must be an array." };
    }

    const normalizedIds: string[] = [];
    for (const id of assignedToUserIds) {
      if (typeof id !== "string") {
        return { error: "Assigned members must be string IDs." };
      }
      const normalized = normalizeString(id);
      if (!normalized) {
        return { error: "Assigned member ID cannot be empty." };
      }
      const member = getMemberById(family, normalized);
      if (!member) {
        return { error: "Assigned member not found in family." };
      }
      normalizedIds.push(member.userId);
    }

    const uniqueIds = Array.from(new Set(normalizedIds));
    return {
      assignedToUserIds: uniqueIds,
      assignedToUserId: uniqueIds[0]
    };
  }

  if (assignedToUserId === null) {
    return { assignedToUserIds: [], assignedToUserId: undefined };
  }

  const normalized = normalizeString(assignedToUserId ?? "");
  if (!normalized) {
    return { assignedToUserIds: [], assignedToUserId: undefined };
  }

  const member = getMemberById(family, normalized);
  if (!member) {
    return { error: "Assigned member not found in family." };
  }

  return { assignedToUserIds: [member.userId], assignedToUserId: member.userId };
};

const normalizeDueDate = (
  dueDate: string | null | undefined
): { dueDate?: string; error?: string } => {
  if (dueDate === undefined) {
    return {};
  }

  if (dueDate === null) {
    return { dueDate: undefined };
  }

  const normalized = normalizeString(dueDate);
  if (!normalized) {
    return { dueDate: undefined };
  }

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return { error: "Due date must be a valid date." };
  }

  return { dueDate: new Date(parsed).toISOString() };
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

  const assignment = normalizeAssignments(
    family,
    body.assignedToUserIds,
    body.assignedToUserId
  );
  if (assignment.error) {
    return createErrorResponse({
      code: "bad_request",
      message: assignment.error,
      messageKey: "errors.todo.assignment_invalid",
      status: 400,
      details: {
        assignedToUserId: body.assignedToUserId ?? null,
        assignedToUserIds: body.assignedToUserIds ?? null
      }
    });
  }

  const dueDate = normalizeDueDate(body.dueDate);
  if (dueDate.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: dueDate.error,
      messageKey: "errors.todo.due_date_invalid",
      status: 422,
      details: { dueDate: body.dueDate ?? null }
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
    dueDate: dueDate.dueDate,
    assignedToUserId: assignment.assignedToUserId,
    assignedToUserIds: assignment.assignedToUserIds,
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

  const assignment = normalizeAssignments(
    family,
    body.assignedToUserIds,
    body.assignedToUserId
  );
  if (assignment.error) {
    return createErrorResponse({
      code: "bad_request",
      message: assignment.error,
      messageKey: "errors.todo.assignment_invalid",
      status: 400,
      details: {
        assignedToUserId: body.assignedToUserId ?? null,
        assignedToUserIds: body.assignedToUserIds ?? null
      }
    });
  }

  const notes =
    body.notes === undefined ? undefined : normalizeString(body.notes ?? "");

  const dueDate = normalizeDueDate(body.dueDate);
  if (dueDate.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: dueDate.error,
      messageKey: "errors.todo.due_date_invalid",
      status: 422,
      details: { dueDate: body.dueDate ?? null }
    });
  }

  const updated = await updateFamilyTodo(familyId, todoId, (todo) => {
    const nextAssignedToIds =
      body.assignedToUserIds === undefined && body.assignedToUserId === undefined
        ? todo.assignedToUserIds
        : assignment.assignedToUserIds;

    const nextAssignedTo =
      body.assignedToUserIds === undefined && body.assignedToUserId === undefined
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
      dueDate:
        body.dueDate === undefined
          ? todo.dueDate
          : dueDate.dueDate,
      assignedToUserId: nextAssignedTo,
      assignedToUserIds: nextAssignedToIds,
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
