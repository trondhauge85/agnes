import { apiRequest } from "../../../shared/api";

export type FamilyJoinResponse = {
  status: "joined" | "already_member";
  family: {
    id: string;
    name: string;
    pictureUrl: string;
    createdAt: string;
    metadata: {
      interests: string[];
      goals: string[];
    };
    members: Array<{
      userId: string;
      displayName: string;
      role: string;
      joinedAt: string;
    }>;
  };
  member?: {
    userId: string;
    displayName: string;
    role: string;
    joinedAt: string;
  };
  addedBy?: {
    userId: string;
    role: string;
  };
};

export type JoinFamilyPayload = {
  familyId: string;
  userId: string;
  displayName: string;
  addedByUserId: string;
};

export const joinFamily = async ({ familyId, ...payload }: JoinFamilyPayload) => {
  return apiRequest<FamilyJoinResponse>(`/families/${familyId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};
