import type {
  FamilyProject,
  FamilyProjectCreatePayload,
  FamilyProjectItemLink,
  FamilyProjectItemType,
  FamilyProjectStatus,
  FamilyProjectTimeframe,
  FamilyProjectTimeframeExtension,
  FamilyProjectTimeframeUpdatePayload,
  FamilyProjectUpdatePayload
} from "../types";
import { findFamily } from "../data/families";
import {
  getFamilyProject,
  listFamilyProjects,
  removeFamilyProject,
  saveFamilyProject,
  updateFamilyProject
} from "../data/familyProjects";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString, normalizeStringArray } from "../utils/strings";

const allowedProjectStatuses: FamilyProjectStatus[] = [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled"
];

const allowedItemTypes: FamilyProjectItemType[] = [
  "todo",
  "calendar_event",
  "message",
  "custom"
];

const normalizeProjectStatus = (
  status: string | undefined
): FamilyProjectStatus | null => {
  if (!status) {
    return null;
  }

  const normalized = normalizeString(status);
  if (!normalized) {
    return null;
  }

  if (!allowedProjectStatuses.includes(normalized as FamilyProjectStatus)) {
    return null;
  }

  return normalized as FamilyProjectStatus;
};

const normalizeItemLinks = (
  items: FamilyProjectItemLink[] | null | undefined
): { items?: FamilyProjectItemLink[]; error?: string } => {
  if (items === undefined) {
    return {};
  }

  if (items === null) {
    return { items: [] };
  }

  const normalized = items.map((item) => {
    const type = normalizeString(item.type ?? "");
    const referenceId = normalizeString(item.referenceId ?? "");
    if (!type || !referenceId) {
      return null;
    }
    if (!allowedItemTypes.includes(type as FamilyProjectItemType)) {
      return null;
    }

    const label = normalizeString(item.label ?? "");
    const metadata = item.metadata ?? undefined;

    return {
      type: type as FamilyProjectItemType,
      referenceId,
      label: label || undefined,
      metadata
    };
  });

  if (normalized.some((item) => !item)) {
    return { error: "Project items must include a type and referenceId." };
  }

  return { items: normalized as FamilyProjectItemLink[] };
};

const normalizeDate = (
  value: string | null | undefined,
  label: string
): { value?: string; error?: string } => {
  if (value === undefined) {
    return {};
  }

  if (value === null) {
    return { value: undefined };
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return { value: undefined };
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${label} must be a valid ISO timestamp.` };
  }

  return { value: parsed.toISOString() };
};

const normalizeTimeframe = (
  timeframe: FamilyProjectTimeframeUpdatePayload | undefined,
  existing: FamilyProjectTimeframe
): { timeframe?: FamilyProjectTimeframe; error?: string } => {
  if (!timeframe) {
    return {};
  }

  const startDate = normalizeDate(timeframe.startDate, "Start date");
  if (startDate.error) {
    return { error: startDate.error };
  }

  const targetEndDate = normalizeDate(timeframe.targetEndDate, "Target end date");
  if (targetEndDate.error) {
    return { error: targetEndDate.error };
  }

  const extendTo = normalizeDate(timeframe.extendTo, "Extension end date");
  if (extendTo.error) {
    return { error: extendTo.error };
  }

  const nextStart =
    timeframe.startDate === undefined ? existing.startDate : startDate.value;
  const nextTarget =
    timeframe.targetEndDate === undefined
      ? existing.targetEndDate
      : targetEndDate.value;

  if (nextStart && nextTarget) {
    const start = new Date(nextStart);
    const end = new Date(nextTarget);
    if (start.getTime() > end.getTime()) {
      return { error: "Start date must be before target end date." };
    }
  }

  const extensions = [...existing.extensions];
  if (timeframe.extendTo !== undefined && extendTo.value) {
    const reason = normalizeString(timeframe.extensionReason ?? "");
    const extension: FamilyProjectTimeframeExtension = {
      endDate: extendTo.value,
      reason: reason || undefined,
      createdAt: new Date().toISOString()
    };
    extensions.push(extension);
  }

  return {
    timeframe: {
      startDate: nextStart,
      targetEndDate: nextTarget,
      extensions
    }
  };
};

export const handleFamilyProjectList = async (
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
    projects: listFamilyProjects(familyId)
  });
};

export const handleFamilyProjectCreate = async (
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

  const body = await parseJsonBody<FamilyProjectCreatePayload>(request);
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
      message: "Project title is required.",
      messageKey: "errors.project.title_required",
      status: 400,
      details: { field: "title", reason: "required" }
    });
  }

  const scope = normalizeString(body.scope ?? "");
  if (!scope) {
    return createErrorResponse({
      code: "bad_request",
      message: "Project scope is required.",
      messageKey: "errors.project.scope_required",
      status: 400,
      details: { field: "scope", reason: "required" }
    });
  }

  const description = normalizeString(body.description ?? "");

  const status = normalizeProjectStatus(body.status) ?? "planned";
  if (!status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported project status.",
      messageKey: "errors.project.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const timeframeSeed: FamilyProjectTimeframe = {
    startDate: undefined,
    targetEndDate: undefined,
    extensions: []
  };

  const timeframeUpdate: FamilyProjectTimeframeUpdatePayload | undefined =
    body.timeframe
      ? {
          startDate: body.timeframe.startDate,
          targetEndDate: body.timeframe.targetEndDate
        }
      : undefined;
  const timeframeResult = normalizeTimeframe(timeframeUpdate, timeframeSeed);
  if (timeframeResult.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: timeframeResult.error,
      messageKey: "errors.project.timeframe_invalid",
      status: 422
    });
  }

  const tags = normalizeStringArray(body.tags);
  const itemsResult = normalizeItemLinks(body.items);
  if (itemsResult.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: itemsResult.error,
      messageKey: "errors.project.items_invalid",
      status: 422,
      details: { field: "items", reason: "invalid" }
    });
  }

  const now = new Date().toISOString();
  const project: FamilyProject = {
    id: crypto.randomUUID(),
    familyId,
    title,
    description: description || undefined,
    scope,
    status,
    timeframe: timeframeResult.timeframe ?? timeframeSeed,
    tags,
    items: itemsResult.items ?? [],
    createdAt: now,
    updatedAt: now
  };

  saveFamilyProject(familyId, project);

  return createJsonResponse({
    status: "created",
    project
  });
};

export const handleFamilyProjectUpdate = async (
  request: Request,
  familyId: string,
  projectId: string
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

  const existing = getFamilyProject(familyId, projectId);
  if (!existing) {
    return createErrorResponse({
      code: "not_found",
      message: "Project not found.",
      messageKey: "errors.project.not_found",
      status: 404,
      details: { projectId }
    });
  }

  const body = await parseJsonBody<FamilyProjectUpdatePayload>(request);
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
      message: "Project title cannot be empty.",
      messageKey: "errors.project.title_empty",
      status: 400,
      details: { field: "title", reason: "empty" }
    });
  }

  const scope =
    body.scope === undefined ? undefined : normalizeString(body.scope ?? "");
  if (scope !== undefined && !scope) {
    return createErrorResponse({
      code: "bad_request",
      message: "Project scope cannot be empty.",
      messageKey: "errors.project.scope_empty",
      status: 400,
      details: { field: "scope", reason: "empty" }
    });
  }

  const description =
    body.description === undefined
      ? undefined
      : normalizeString(body.description ?? "");

  const status =
    body.status === undefined
      ? undefined
      : normalizeProjectStatus(body.status ?? "");
  if (body.status !== undefined && !status) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: "Unsupported project status.",
      messageKey: "errors.project.status_unsupported",
      status: 422,
      details: { field: "status", reason: "unsupported" }
    });
  }

  const timeframeResult = normalizeTimeframe(body.timeframe, existing.timeframe);
  if (timeframeResult.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: timeframeResult.error,
      messageKey: "errors.project.timeframe_invalid",
      status: 422
    });
  }

  const tags =
    body.tags === undefined
      ? undefined
      : body.tags === null
        ? []
        : normalizeStringArray(body.tags);

  const itemsResult = normalizeItemLinks(body.items);
  if (itemsResult.error) {
    return createErrorResponse({
      code: "unprocessable_entity",
      message: itemsResult.error,
      messageKey: "errors.project.items_invalid",
      status: 422,
      details: { field: "items", reason: "invalid" }
    });
  }

  const updated = updateFamilyProject(familyId, projectId, (project) => ({
    ...project,
    title: title ?? project.title,
    description:
      body.description === undefined ? project.description : description || undefined,
    scope: scope ?? project.scope,
    status: status ?? project.status,
    timeframe: timeframeResult.timeframe ?? project.timeframe,
    tags: tags ?? project.tags,
    items: itemsResult.items ?? project.items,
    updatedAt: new Date().toISOString()
  }));

  if (!updated) {
    return createErrorResponse({
      code: "not_found",
      message: "Project not found.",
      messageKey: "errors.project.not_found",
      status: 404,
      details: { projectId }
    });
  }

  return createJsonResponse({
    status: "updated",
    project: updated
  });
};

export const handleFamilyProjectDelete = async (
  familyId: string,
  projectId: string
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

  const removed = removeFamilyProject(familyId, projectId);
  if (!removed) {
    return createErrorResponse({
      code: "not_found",
      message: "Project not found.",
      messageKey: "errors.project.not_found",
      status: 404,
      details: { projectId }
    });
  }

  return createJsonResponse({
    status: "deleted",
    project: removed
  });
};
