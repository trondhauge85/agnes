import type { DatabaseAdapter } from "../db/adapter";
import { getDatabaseAdapter } from "../db/client";
import type { FamilyTodo } from "../types";

type FamilyTodoRow = {
  id: string;
  family_id: string;
  title: string;
  notes: string | null;
  status: FamilyTodo["status"];
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const toSqlValue = (value: string | null | undefined): string =>
  value ? escapeLiteral(value) : "NULL";

const serializeRow = (row: FamilyTodoRow): FamilyTodo => ({
  id: row.id,
  familyId: row.family_id,
  title: row.title,
  notes: row.notes ?? undefined,
  status: row.status,
  assignedToUserId: row.assigned_to_user_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const getAdapter = async (
  adapter?: DatabaseAdapter
): Promise<DatabaseAdapter> => adapter ?? getDatabaseAdapter();

export const listFamilyTodos = async (
  familyId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyTodo[]> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyTodoRow>(
    `SELECT id, family_id, title, notes, status, assigned_to_user_id, created_at, updated_at
     FROM family_todos
     WHERE family_id = ${escapeLiteral(familyId)}
     ORDER BY created_at DESC`
  );
  return rows.map(serializeRow);
};

export const saveFamilyTodo = async (
  familyId: string,
  todo: FamilyTodo,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  await db.execute(
    `INSERT INTO family_todos (
      id,
      family_id,
      title,
      notes,
      status,
      assigned_to_user_id,
      created_at,
      updated_at
    ) VALUES (
      ${escapeLiteral(todo.id)},
      ${escapeLiteral(familyId)},
      ${escapeLiteral(todo.title)},
      ${toSqlValue(todo.notes)},
      ${escapeLiteral(todo.status)},
      ${toSqlValue(todo.assignedToUserId)},
      ${escapeLiteral(todo.createdAt)},
      ${escapeLiteral(todo.updatedAt)}
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      notes = excluded.notes,
      status = excluded.status,
      assigned_to_user_id = excluded.assigned_to_user_id,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at`
  );
};

export const getFamilyTodo = async (
  familyId: string,
  todoId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyTodo | null> => {
  const db = await getAdapter(adapter);
  const rows = await db.query<FamilyTodoRow>(
    `SELECT id, family_id, title, notes, status, assigned_to_user_id, created_at, updated_at
     FROM family_todos
     WHERE family_id = ${escapeLiteral(familyId)}
       AND id = ${escapeLiteral(todoId)}
     LIMIT 1`
  );
  const row = rows[0];
  return row ? serializeRow(row) : null;
};

export const updateFamilyTodo = async (
  familyId: string,
  todoId: string,
  update: (todo: FamilyTodo) => FamilyTodo,
  adapter?: DatabaseAdapter
): Promise<FamilyTodo | null> => {
  const db = await getAdapter(adapter);
  return db.transaction(async (tx) => {
    const existing = await getFamilyTodo(familyId, todoId, tx);
    if (!existing) {
      return null;
    }

    const updated = update(existing);
    await saveFamilyTodo(familyId, updated, tx);
    return updated;
  });
};

export const removeFamilyTodo = async (
  familyId: string,
  todoId: string,
  adapter?: DatabaseAdapter
): Promise<FamilyTodo | null> => {
  const db = await getAdapter(adapter);
  return db.transaction(async (tx) => {
    const existing = await getFamilyTodo(familyId, todoId, tx);
    if (!existing) {
      return null;
    }

    await tx.execute(
      `DELETE FROM family_todos
       WHERE family_id = ${escapeLiteral(familyId)}
         AND id = ${escapeLiteral(todoId)}`
    );
    return existing;
  });
};
