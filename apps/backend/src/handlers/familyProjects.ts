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
import { createJsonResponse, parseJsonBody } from "../utils/http";
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
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
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
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyProjectCreatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const title = normalizeString(body.title ?? "");
  if (!title) {
    return createJsonResponse({ error: "Project title is required." }, 400);
  }

  const scope = normalizeString(body.scope ?? "");
  if (!scope) {
    return createJsonResponse({ error: "Project scope is required." }, 400);
  }

  const description = normalizeString(body.description ?? "");

  const status = normalizeProjectStatus(body.status) ?? "planned";
  if (!status) {
    return createJsonResponse({ error: "Unsupported project status." }, 400);
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
    return createJsonResponse({ error: timeframeResult.error }, 400);
  }

  const tags = normalizeStringArray(body.tags);
  const itemsResult = normalizeItemLinks(body.items);
  if (itemsResult.error) {
    return createJsonResponse({ error: itemsResult.error }, 400);
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
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const existing = getFamilyProject(familyId, projectId);
  if (!existing) {
    return createJsonResponse({ error: "Project not found." }, 404);
  }

  const body = await parseJsonBody<FamilyProjectUpdatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const title =
    body.title === undefined ? undefined : normalizeString(body.title ?? "");
  if (title !== undefined && !title) {
    return createJsonResponse({ error: "Project title cannot be empty." }, 400);
  }

  const scope =
    body.scope === undefined ? undefined : normalizeString(body.scope ?? "");
  if (scope !== undefined && !scope) {
    return createJsonResponse({ error: "Project scope cannot be empty." }, 400);
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
    return createJsonResponse({ error: "Unsupported project status." }, 400);
  }

  const timeframeResult = normalizeTimeframe(body.timeframe, existing.timeframe);
  if (timeframeResult.error) {
    return createJsonResponse({ error: timeframeResult.error }, 400);
  }

  const tags =
    body.tags === undefined
      ? undefined
      : body.tags === null
        ? []
        : normalizeStringArray(body.tags);

  const itemsResult = normalizeItemLinks(body.items);
  if (itemsResult.error) {
    return createJsonResponse({ error: itemsResult.error }, 400);
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
    return createJsonResponse({ error: "Project not found." }, 404);
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
  const family = findFamily(familyId);
  if (!family) {
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const removed = removeFamilyProject(familyId, projectId);
  if (!removed) {
    return createJsonResponse({ error: "Project not found." }, 404);
  }

  return createJsonResponse({
    status: "deleted",
    project: removed
  });
};
