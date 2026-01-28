import type { FamilyBudget } from "../types";

const familyBudgets = new Map<string, FamilyBudget[]>();

export const listFamilyBudgets = (familyId: string): FamilyBudget[] =>
  familyBudgets.get(familyId)?.map((budget) => ({ ...budget })) ?? [];

export const saveFamilyBudget = (familyId: string, budget: FamilyBudget): void => {
  const existing = familyBudgets.get(familyId) ?? [];
  familyBudgets.set(familyId, [...existing, { ...budget }]);
};

export const getFamilyBudget = (
  familyId: string,
  budgetId: string
): FamilyBudget | null => {
  const budgets = familyBudgets.get(familyId) ?? [];
  return budgets.find((budget) => budget.id === budgetId) ?? null;
};

export const updateFamilyBudget = (
  familyId: string,
  budgetId: string,
  update: (budget: FamilyBudget) => FamilyBudget
): FamilyBudget | null => {
  const budgets = familyBudgets.get(familyId) ?? [];
  const index = budgets.findIndex((budget) => budget.id === budgetId);
  if (index === -1) {
    return null;
  }

  const updated = update(budgets[index]);
  const next = [...budgets];
  next[index] = { ...updated };
  familyBudgets.set(familyId, next);
  return updated;
};

export const removeFamilyBudget = (
  familyId: string,
  budgetId: string
): FamilyBudget | null => {
  const budgets = familyBudgets.get(familyId) ?? [];
  const match = budgets.find((budget) => budget.id === budgetId) ?? null;
  if (!match) {
    return null;
  }

  familyBudgets.set(
    familyId,
    budgets.filter((budget) => budget.id !== budgetId)
  );
  return match;
};
