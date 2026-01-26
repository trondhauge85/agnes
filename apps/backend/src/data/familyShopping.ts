import type { DatabaseAdapter } from "../db/adapter";
import { getDatabaseAdapter } from "../db/client";
import type { FamilyShoppingItem } from "../types";

type FamilyShoppingRow = {
  id: string;
  family_id: string;
  title: string;
  notes: string | null;
  quantity: number | null;
  unit: string | null;
  status: FamilyShoppingItem["status"];
  created_at: string;
  updated_at: string;
};

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const toSqlValue = (value: string | null | undefined): string =>
  value ? escapeLiteral(value) : "NULL";

const toSqlNumber = (value: number | null | undefined): string =>
  Number.isFinite(value) ? String(value) : "NULL";

const serializeRow = (row: FamilyShoppingRow): FamilyShoppingItem => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  notes: row.notes ?? undefined,
  quantity: row.quantity ?? undefined,
  unit: row.unit ?? undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const getAdapter = async (
  adapter?: DatabaseAdapter
): Promise<DatabaseAdapter> => adapter ?? getDatabaseAdapter();

export const listFamilyShoppingItems = async (
  familyId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyShoppingItem[]> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyShoppingRow>(
    `SELECT id, family_id, title, notes, quantity, unit, status, created_at, updated_at
     FROM family_shopping_items
     WHERE family_id = ${escapeLiteral(familyId)}
     ORDER BY created_at DESC`
  );
  return rows.map(serializeRow);
};

export const saveFamilyShoppingItem = async (
  familyId: string,
  item: FamilyShoppingItem,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  await db.execute(
    `INSERT INTO family_shopping_items (
      id,
      family_id,
      title,
      notes,
      quantity,
      unit,
      status,
      created_at,
      updated_at
    ) VALUES (
      ${escapeLiteral(item.id)},
      ${escapeLiteral(familyId)},
      ${escapeLiteral(item.title)},
      ${toSqlValue(item.notes)},
      ${toSqlNumber(item.quantity)},
      ${toSqlValue(item.unit)},
      ${escapeLiteral(item.status)},
      ${escapeLiteral(item.createdAt)},
      ${escapeLiteral(item.updatedAt)}
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      notes = excluded.notes,
      quantity = excluded.quantity,
      unit = excluded.unit,
      status = excluded.status,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at`
  );
};

export const getFamilyShoppingItem = async (
  familyId: string,
  itemId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyShoppingItem | null> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyShoppingRow>(
    `SELECT id, family_id, title, notes, quantity, unit, status, created_at, updated_at
     FROM family_shopping_items
     WHERE family_id = ${escapeLiteral(familyId)}
       AND id = ${escapeLiteral(itemId)}
     LIMIT 1`
  );
  const row = rows[0];
  return row ? serializeRow(row) : null;
};

export const updateFamilyShoppingItem = async (
  familyId: string,
  itemId: string,
  update: (item: FamilyShoppingItem) => FamilyShoppingItem,
  adapter?: DatabaseAdapter
): Promise<FamilyShoppingItem | null> => {
  const db = await getAdapter(adapter);
  return db.transaction(async (tx) => {
    const existing = await getFamilyShoppingItem(familyId, itemId, tx);
    if (!existing) {
      return null;
    }

    const updated = update(existing);
    await saveFamilyShoppingItem(familyId, updated, tx);
    return updated;
  });
};

export const removeFamilyShoppingItem = async (
  familyId: string,
  itemId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyShoppingItem | null> => {
  const db = await getAdapter(adapter);
  return db.transaction(async (tx) => {
    const existing = await getFamilyShoppingItem(familyId, itemId, tx);
    if (!existing) {
      return null;
    }

    await tx.execute(
      `DELETE FROM family_shopping_items
       WHERE family_id = ${escapeLiteral(familyId)}
         AND id = ${escapeLiteral(itemId)}`
    );
    return existing;
  });
};
