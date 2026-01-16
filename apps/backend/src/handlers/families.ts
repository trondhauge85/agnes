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
import { createJsonResponse, parseJsonBody } from "../utils/http";
import { normalizeString, normalizeStringArray } from "../utils/strings";

export const handleFamilyCreate = async (request: Request): Promise<Response> => {
  const body = await parseJsonBody<FamilyCreatePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
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
    return createJsonResponse({ error: "Family name is required." }, 400);
  }

  if (!pictureUrl) {
    return createJsonResponse({ error: "Family pictureUrl is required." }, 400);
  }

  if (!creatorId || !creatorName) {
    return createJsonResponse(
      { error: "creator.userId and creator.displayName are required." },
      400
    );
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
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyJoinPayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const userId = normalizeString(body.userId ?? "");
  const displayName = normalizeString(body.displayName ?? "");
  const addedByUserId = normalizeString(body.addedByUserId ?? "");
  const phoneNumber = normalizeString(body.phoneNumber ?? "");

  if (!userId || !displayName || !addedByUserId) {
    return createJsonResponse(
      {
        error:
          "userId, displayName, and addedByUserId are required to join a family."
      },
      400
    );
  }

  const addedByMember = getMemberById(family, addedByUserId);
  if (!addedByMember || !canAddMembers(addedByMember.role)) {
    return createJsonResponse(
      { error: "Only owners or admins can add family members." },
      403
    );
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
    return createJsonResponse({ error: "Family not found." }, 404);
  }

  const body = await parseJsonBody<FamilyLeavePayload>(request);
  if (!body) {
    return createJsonResponse(
      { error: "Expected application/json payload." },
      400
    );
  }

  const userId = normalizeString(body.userId ?? "");
  if (!userId) {
    return createJsonResponse({ error: "userId is required to leave." }, 400);
  }

  const member = getMemberById(family, userId);
  if (!member) {
    return createJsonResponse(
      { error: "Member not found in family." },
      404
    );
  }

  if (member.role === "owner") {
    const ownerCount = family.members.filter((item) => item.role === "owner")
      .length;
    if (ownerCount <= 1) {
      return createJsonResponse(
        { error: "Families must have at least one owner." },
        400
      );
    }
  }

  family.members = family.members.filter((item) => item.userId !== userId);

  return createJsonResponse({
    status: "left",
    family: serializeFamily(family),
    removedMember: member
  });
};
