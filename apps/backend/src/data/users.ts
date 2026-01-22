import type { DatabaseAdapter } from "../db/adapter";
import { getDatabaseAdapter } from "../db/client";
import type { User } from "../types";

const escapeLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const toSqlValue = (value: string | null | undefined): string =>
  value ? escapeLiteral(value) : "NULL";

const getAdapter = async (
  adapter?: DatabaseAdapter
): Promise<DatabaseAdapter> => adapter ?? getDatabaseAdapter();

export const upsertUser = async (
  user: User,
  adapter?: DatabaseAdapter
): Promise<void> => {
  const db = await getAdapter(adapter);
  await db.execute(
    `INSERT INTO users (
      id,
      display_name,
      phone_number,
      created_at,
      updated_at
    ) VALUES (
      ${escapeLiteral(user.id)},
      ${escapeLiteral(user.displayName)},
      ${toSqlValue(user.phoneNumber)},
      ${escapeLiteral(user.createdAt)},
      ${escapeLiteral(user.updatedAt)}
    )
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      phone_number = excluded.phone_number,
      updated_at = excluded.updated_at`
  );
};
