import type { Family, FamilyMember, FamilyRole } from "../types";

const families = new Map<string, Family>();

export const familyRoles: FamilyRole[] = ["owner", "admin", "member"];

export const findFamily = (familyId: string): Family | null =>
  families.get(familyId) ?? null;

export const saveFamily = (family: Family): void => {
  families.set(family.id, family);
};

export const listFamilies = (): Family[] =>
  Array.from(families.values()).map((family) => serializeFamily(family));

export const getMemberById = (
  family: Family,
  userId: string
): FamilyMember | undefined => family.members.find((member) => member.userId === userId);

export const canAddMembers = (role: FamilyRole): boolean =>
  role === "owner" || role === "admin";

export const serializeFamily = (family: Family): Family => ({
  ...family,
  members: [...family.members]
});
