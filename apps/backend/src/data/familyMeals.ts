import type { DatabaseAdapter } from "../db/adapter";
import { getDatabaseAdapter } from "../db/client";
import type { FamilyMeal } from "../types";

type FamilyMealRow = {
  id: string;
  family_id: string;
  title: string;
  notes: string | null;
  status: FamilyMeal["status"];
  meal_type: FamilyMeal["mealType"];
  scheduled_for: string | null;
  servings: number | null;
  recipe_url: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const toSqlValue = (value: string | null | undefined): string =>
  value ? escapeLiteral(value) : "NULL";

const toSqlNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? "NULL" : String(value);

const serializeRow = (row: FamilyMealRow): FamilyMeal => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  notes: row.notes ?? undefined,
  status: row.status,
  mealType: row.meal_type,
  scheduledFor: row.scheduled_for ?? undefined,
  servings: row.servings ?? undefined,
  recipeUrl: row.recipe_url ?? undefined,
  assignedToUserId: row.assigned_to_user_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const getAdapter = async (
  adapter?: DatabaseAdapter
): Promise<DatabaseAdapter> => adapter ?? getDatabaseAdapter();

export const listFamilyMeals = async (
  familyId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyMeal[]> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyMealRow>(
    `SELECT id, family_id, title, notes, status, meal_type, scheduled_for,
      servings, recipe_url, assigned_to_user_id, created_at, updated_at
     FROM family_meals
     WHERE family_id = ${escapeLiteral(familyId)}
     ORDER BY created_at DESC`
  );
  return rows.map(serializeRow);
};

export const saveFamilyMeal = async (
  familyId: string,
  meal: FamilyMeal,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  await db.execute(
    `INSERT INTO family_meals (
      id,
      family_id,
      title,
      notes,
      status,
      meal_type,
      scheduled_for,
      servings,
      recipe_url,
      assigned_to_user_id,
      created_at,
      updated_at
    ) VALUES (
      ${escapeLiteral(meal.id)},
      ${escapeLiteral(familyId)},
      ${escapeLiteral(meal.title)},
      ${toSqlValue(meal.notes)},
      ${escapeLiteral(meal.status)},
      ${escapeLiteral(meal.mealType)},
      ${toSqlValue(meal.scheduledFor)},
      ${toSqlNumber(meal.servings)},
      ${toSqlValue(meal.recipeUrl)},
      ${toSqlValue(meal.assignedToUserId)},
      ${escapeLiteral(meal.createdAt)},
      ${escapeLiteral(meal.updatedAt)}
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      notes = excluded.notes,
      status = excluded.status,
      meal_type = excluded.meal_type,
      scheduled_for = excluded.scheduled_for,
      servings = excluded.servings,
      recipe_url = excluded.recipe_url,
      assigned_to_user_id = excluded.assigned_to_user_id,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at`
  );
};

export const getFamilyMeal = async (
  familyId: string,
  mealId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyMeal | null> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyMealRow>(
    `SELECT id, family_id, title, notes, status, meal_type, scheduled_for,
      servings, recipe_url, assigned_to_user_id, created_at, updated_at
     FROM family_meals
     WHERE family_id = ${escapeLiteral(familyId)}
       AND id = ${escapeLiteral(mealId)}
     LIMIT 1`
  );
  const row = rows[0];
  return row ? serializeRow(row) : null;
};

export const updateFamilyMeal = async (
  familyId: string,
  mealId: string,
  update: (meal: FamilyMeal) => FamilyMeal,
  adapter?: DatabaseAdapter
): Promise<FamilyMeal | null> => {
  const db = await getAdapter(adapter);
  return db.transaction(async (tx) => {
    const existing = await getFamilyMeal(familyId, mealId, tx);
    if (!existing) {
      return null;
    }

    const updated = update(existing);
    await saveFamilyMeal(familyId, updated, tx);
    return updated;
  });
};

export const removeFamilyMeal = async (
  familyId: string,
  mealId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyMeal | null> => {
  const db = await getAdapter(adapter);
  return db.transaction(async (tx) => {
    const existing = await getFamilyMeal(familyId, mealId, tx);
    if (!existing) {
      return null;
    }

    await tx.execute(
      `DELETE FROM family_meals
       WHERE family_id = ${escapeLiteral(familyId)}
         AND id = ${escapeLiteral(mealId)}`
    );
    return existing;
  });
};
