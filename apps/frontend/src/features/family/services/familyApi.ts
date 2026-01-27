import { apiRequest } from "../../../shared/api";

export type FamilyJoinResponse = {
  status: "joined" | "already_member";
  family: {
    id: string;
    name: string;
    pictureUrl: string;
    preferredLanguage?: string;
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
  userId?: string;
  displayName: string;
  addedByUserId: string;
  email?: string;
  phoneNumber?: string;
  age?: number;
};

export type FamilyDetail = {
  id: string;
  name: string;
  pictureUrl: string;
  preferredLanguage?: string;
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
    email?: string;
    phoneNumber?: string;
    age?: number;
  }>;
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

export const fetchFamilyDetail = async (familyId: string): Promise<FamilyDetail> =>
  apiRequest<{ family: FamilyDetail }>(`/families/${familyId}`).then((response) => response.family);
