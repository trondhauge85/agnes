import type { FamilyMeal } from "../types";

const familyMeals = new Map<string, FamilyMeal[]>();

export const listFamilyMeals = (familyId: string): FamilyMeal[] =>
  familyMeals.get(familyId)?.map((meal) => ({ ...meal })) ?? [];

export const saveFamilyMeal = (familyId: string, meal: FamilyMeal): void => {
  const existing = familyMeals.get(familyId) ?? [];
  familyMeals.set(familyId, [...existing, { ...meal }]);
};

export const getFamilyMeal = (
  familyId: string,
  mealId: string
): FamilyMeal | null => {
  const meals = familyMeals.get(familyId) ?? [];
  return meals.find((meal) => meal.id === mealId) ?? null;
};

export const updateFamilyMeal = (
  familyId: string,
  mealId: string,
  update: (meal: FamilyMeal) => FamilyMeal
): FamilyMeal | null => {
  const meals = familyMeals.get(familyId) ?? [];
  const index = meals.findIndex((meal) => meal.id === mealId);
  if (index === -1) {
    return null;
  }

  const updated = update(meals[index]);
  const next = [...meals];
  next[index] = { ...updated };
  familyMeals.set(familyId, next);
  return updated;
};

export const removeFamilyMeal = (
  familyId: string,
  mealId: string
): FamilyMeal | null => {
  const meals = familyMeals.get(familyId) ?? [];
  const match = meals.find((meal) => meal.id === mealId) ?? null;
  if (!match) {
    return null;
  }
  familyMeals.set(
    familyId,
    meals.filter((meal) => meal.id !== mealId)
  );
  return match;
};
