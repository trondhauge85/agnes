import { apiRequest } from "../../../shared/api";

type FamilyCreatePayload = {
  name: string;
  pictureUrl: string;
  creator: {
    userId: string;
    displayName: string;
  };
  metadata?: {
    interests?: string[];
  };
};

type FamilyCreateResponse = {
  status: string;
  family: {
    id: string;
    name: string;
    pictureUrl: string;
  };
  message?: string;
};

export const createFamily = async (payload: FamilyCreatePayload): Promise<FamilyCreateResponse> => {
  return apiRequest<FamilyCreateResponse>("/families", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};
