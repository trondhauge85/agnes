import { apiRequest } from "../../../shared/api";

export type FamilyShoppingItem = {
  id: string;
  familyId: string;
  title: string;
  notes?: string;
  quantity?: number;
  unit?: string;
  status: "open" | "completed";
  createdAt: string;
  updatedAt: string;
};

type FamilyShoppingResponse = {
  familyId: string;
  items: FamilyShoppingItem[];
};

export const fetchFamilyShoppingItems = async (
  familyId: string
): Promise<FamilyShoppingResponse> =>
  apiRequest<FamilyShoppingResponse>(`/families/${familyId}/shopping-items`);
