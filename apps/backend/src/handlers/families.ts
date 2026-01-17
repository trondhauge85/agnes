import type {
  Family,
  FamilyCreatePayload,
  FamilyJoinPayload,
  FamilyLeavePayload,
  FamilyMember,
  FamilyMetadata
} from "../types";
import {
  canAddMembers,
  familyRoles,
  findFamily,
  getMemberById,
  saveFamily,
  serializeFamily
} from "../data/families";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString, normalizeStringArray } from "../utils/strings";

export const handleFamilyCreate = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<FamilyCreatePayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const name = normalizeString(body.name ?? "");
  const pictureUrl = normalizeString(body.pictureUrl ?? "");
  const creatorId = normalizeString(body.creator?.userId ?? "");
  const creatorName = normalizeString(body.creator?.displayName ?? "");
  const creatorPhone = normalizeString(body.creator?.phoneNumber ?? "");
  const metadata: FamilyMetadata = {
    interests: normalizeStringArray(body.metadata?.interests),
    goals: normalizeStringArray(body.metadata?.goals)
  };

  if (!name) {
    return createErrorResponse({
      code: "bad_request",
      message: "Family name is required.",
      messageKey: "errors.family.name_required",
      status: 400,
      details: { field: "name", reason: "required" }
    });
  }

  if (!pictureUrl) {
    return createErrorResponse({
      code: "bad_request",
      message: "Family pictureUrl is required.",
      messageKey: "errors.family.picture_required",
      status: 400,
      details: { field: "pictureUrl", reason: "required" }
    });
  }

  if (!creatorId || !creatorName) {
    return createErrorResponse({
      code: "bad_request",
      message: "creator.userId and creator.displayName are required.",
      messageKey: "errors.family.creator_required",
      status: 400,
      details: { fields: ["creator.userId", "creator.displayName"], reason: "required" }
    });
  }

  const now = new Date().toISOString();
  const family: Family = {
    id: crypto.randomUUID(),
    name,
    pictureUrl,
    createdAt: now,
    metadata,
    members: [
      {
        userId: creatorId,
        displayName: creatorName,
        role: "owner",
        joinedAt: now,
        phoneNumber: creatorPhone || undefined
      }
    ]
  };

  saveFamily(family);

  return createJsonResponse({
    status: "created",
    family: serializeFamily(family),
    roles: familyRoles,
    message:
      "Family created. Use the join endpoint with an admin/owner to add more members."
  });
};

export const handleFamilyJoin = async (
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

  const body = await parseJsonBody<FamilyJoinPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const userId = normalizeString(body.userId ?? "");
  const displayName = normalizeString(body.displayName ?? "");
  const addedByUserId = normalizeString(body.addedByUserId ?? "");
  const phoneNumber = normalizeString(body.phoneNumber ?? "");

  if (!userId || !displayName || !addedByUserId) {
    return createErrorResponse({
      code: "bad_request",
      message:
        "userId, displayName, and addedByUserId are required to join a family.",
      messageKey: "errors.family.join_required_fields",
      status: 400,
      details: {
        fields: ["userId", "displayName", "addedByUserId"],
        reason: "required"
      }
    });
  }

  const addedByMember = getMemberById(family, addedByUserId);
  if (!addedByMember || !canAddMembers(addedByMember.role)) {
    return createErrorResponse({
      code: "forbidden",
      message: "Only owners or admins can add family members.",
      messageKey: "errors.family.join_forbidden",
      status: 403,
      details: { addedByUserId }
    });
  }

  const existingMember = getMemberById(family, userId);
  if (existingMember) {
    return createJsonResponse({
      status: "already_member",
      family: serializeFamily(family),
      member: existingMember
    });
  }

  const now = new Date().toISOString();
  const newMember: FamilyMember = {
    userId,
    displayName,
    role: "member",
    joinedAt: now,
    phoneNumber: phoneNumber || undefined
  };
  family.members.push(newMember);

  return createJsonResponse({
    status: "joined",
    family: serializeFamily(family),
    member: newMember,
    addedBy: {
      userId: addedByMember.userId,
      role: addedByMember.role
    }
  });
};

export const handleFamilyLeave = async (
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

  const body = await parseJsonBody<FamilyLeavePayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const userId = normalizeString(body.userId ?? "");
  if (!userId) {
    return createErrorResponse({
      code: "bad_request",
      message: "userId is required to leave.",
      messageKey: "errors.family.leave_user_required",
      status: 400,
      details: { field: "userId", reason: "required" }
    });
  }

  const member = getMemberById(family, userId);
  if (!member) {
    return createErrorResponse({
      code: "not_found",
      message: "Member not found in family.",
      messageKey: "errors.family.member_not_found",
      status: 404,
      details: { userId }
    });
  }

  if (member.role === "owner") {
    const ownerCount = family.members.filter((item) => item.role === "owner")
      .length;
    if (ownerCount <= 1) {
      return createErrorResponse({
        code: "bad_request",
        message: "Families must have at least one owner.",
        messageKey: "errors.family.owner_required",
        status: 400
      });
    }
  }

  family.members = family.members.filter((item) => item.userId !== userId);

  return createJsonResponse({
    status: "left",
    family: serializeFamily(family),
    removedMember: member
  });
};
