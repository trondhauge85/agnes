import type {
  Family,
  FamilyCreatePayload,
  FamilyJoinPayload,
  FamilyLeavePayload,
  FamilyMember,
  FamilyMetadata
} from "../types";
import {
  addFamilyMember,
  canAddMembers,
  familyRoles,
  findFamily,
  getMemberById,
  removeFamilyMember,
  saveFamily,
  serializeFamily
} from "../data/families";
import { upsertUser } from "../data/users";
import { createDefaultMessageService } from "../communications";
import { getDatabaseAdapter } from "../db/client";
import { createErrorResponse, createJsonResponse, parseJsonBody } from "../utils/http";
import { isEmail, normalizeString, normalizeStringArray } from "../utils/strings";

const parseAge = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? Math.floor(value) : undefined;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed >= 0 ? parsed : undefined;
  }
  return undefined;
};

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
  const creatorIdRaw = normalizeString(body.creator?.userId ?? "");
  const creatorName = normalizeString(body.creator?.displayName ?? "");
  const creatorEmail = normalizeString(body.creator?.email ?? "");
  const creatorPhone = normalizeString(body.creator?.phoneNumber ?? "");
  const creatorAge = parseAge(body.creator?.age);
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

  if (!creatorName) {
    return createErrorResponse({
      code: "bad_request",
      message: "creator.displayName is required.",
      messageKey: "errors.family.creator_required",
      status: 400,
      details: { fields: ["creator.displayName"], reason: "required" }
    });
  }

  const creatorId = creatorIdRaw || crypto.randomUUID();
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
        email: creatorEmail || undefined,
        phoneNumber: creatorPhone || undefined,
        age: creatorAge
      }
    ]
  };

  const adapter = await getDatabaseAdapter();
  await adapter.transaction(async (tx) => {
    await upsertUser(
      {
        id: creatorId,
        displayName: creatorName,
        email: creatorEmail || undefined,
        phoneNumber: creatorPhone || undefined,
        age: creatorAge,
        createdAt: now,
        updatedAt: now
      },
      tx
    );
    await saveFamily(family, tx);
  });

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

  const body = await parseJsonBody<FamilyJoinPayload>(request);
  if (!body) {
    return createErrorResponse({
      code: "bad_request",
      message: "Expected application/json payload.",
      messageKey: "errors.request.invalid_json",
      status: 400
    });
  }

  const userIdRaw = normalizeString(body.userId ?? "");
  const displayName = normalizeString(body.displayName ?? "");
  const addedByUserId = normalizeString(body.addedByUserId ?? "");
  const email = normalizeString(body.email ?? "");
  const phoneNumber = normalizeString(body.phoneNumber ?? "");
  const age = parseAge(body.age);

  if (!displayName || !addedByUserId) {
    return createErrorResponse({
      code: "bad_request",
      message:
        "displayName and addedByUserId are required to join a family.",
      messageKey: "errors.family.join_required_fields",
      status: 400,
      details: {
        fields: ["displayName", "addedByUserId"],
        reason: "required"
      }
    });
  }

  const userId = userIdRaw || crypto.randomUUID();
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
    email: email || undefined,
    phoneNumber: phoneNumber || undefined,
    age
  };

  const adapter = await getDatabaseAdapter();
  await adapter.transaction(async (tx) => {
    await upsertUser(
      {
        id: userId,
        displayName,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        age,
        createdAt: now,
        updatedAt: now
      },
      tx
    );
    await addFamilyMember(familyId, newMember, tx);
  });
  const updatedFamily = (await findFamily(familyId, adapter)) ?? family;

  const messageService = createDefaultMessageService();
  if (messageService && age !== undefined && age >= 18 && (phoneNumber || email)) {
    const inviteEmail = email && isEmail(email) ? email : null;
    if (inviteEmail) {
      await messageService.sendCommunication({
        channel: "email",
        idempotencyKey: `family-invite-${familyId}-${userId}`,
        message: `${addedByMember.displayName} invited you to join ${family.name} on Agnes.`,
        recipients: [{ address: inviteEmail, name: displayName }]
      });
    }
  }

  return createJsonResponse({
    status: "joined",
    family: serializeFamily(updatedFamily),
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

  const adapter = await getDatabaseAdapter();
  await removeFamilyMember(familyId, userId, adapter);
  const updatedFamily = (await findFamily(familyId, adapter)) ?? {
    ...family,
    members: family.members.filter((item) => item.userId !== userId)
  };

  return createJsonResponse({
    status: "left",
    family: serializeFamily(updatedFamily),
    removedMember: member
  });
};
