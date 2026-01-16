import type { FamilyShoppingItem } from "../types";

const familyShoppingItems = new Map<string, FamilyShoppingItem[]>();

export const listFamilyShoppingItems = (familyId: string): FamilyShoppingItem[] =>
  familyShoppingItems.get(familyId)?.map((item) => ({ ...item })) ?? [];

export const saveFamilyShoppingItem = (
  familyId: string,
  item: FamilyShoppingItem
): void => {
  const existing = familyShoppingItems.get(familyId) ?? [];
  familyShoppingItems.set(familyId, [...existing, { ...item }]);
};

export const getFamilyShoppingItem = (
  familyId: string,
  itemId: string
): FamilyShoppingItem | null => {
  const items = familyShoppingItems.get(familyId) ?? [];
  return items.find((item) => item.id === itemId) ?? null;
};

export const updateFamilyShoppingItem = (
  familyId: string,
  itemId: string,
  update: (item: FamilyShoppingItem) => FamilyShoppingItem
): FamilyShoppingItem | null => {
  const items = familyShoppingItems.get(familyId) ?? [];
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) {
    return null;
  }

  const updated = update(items[index]);
  const next = [...items];
  next[index] = { ...updated };
  familyShoppingItems.set(familyId, next);
  return updated;
};

export const removeFamilyShoppingItem = (
  familyId: string,
  itemId: string
): FamilyShoppingItem | null => {
  const items = familyShoppingItems.get(familyId) ?? [];
  const match = items.find((item) => item.id === itemId) ?? null;
  if (!match) {
    return null;
  }
  familyShoppingItems.set(
    familyId,
    items.filter((item) => item.id !== itemId)
  );
  return match;
};
