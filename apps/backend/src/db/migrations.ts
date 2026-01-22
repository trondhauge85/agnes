import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseAdapter } from "./adapter";

const migrationsDirectory = fileURLToPath(
  new URL("./migrations", import.meta.url)
);

const escapeLiteral = (value: string): string =>
  `'${value.replace(/'/g, "''")}'`;

const ensureMigrationsTable = async (adapter: DatabaseAdapter): Promise<void> => {
  await adapter.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);
};

const listMigrationFiles = async (): Promise<string[]> => {
  const files = await readdir(migrationsDirectory);
  return files.filter((file) => file.endsWith(".sql")).sort();
};

export const runMigrations = async (
  adapter: DatabaseAdapter
): Promise<string[]> => {
  await ensureMigrationsTable(adapter);

  const appliedRows = await adapter.query<{ id: string }>(
    "SELECT id FROM schema_migrations"
  );
  const applied = new Set(appliedRows.map((row) => row.id));
  const files = await listMigrationFiles();
  const appliedThisRun: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const fullPath = path.join(migrationsDirectory, file);
    const sql = await readFile(fullPath, "utf8");
    const appliedAt = new Date().toISOString();

    await adapter.transaction(async (tx) => {
      await tx.execute(sql);
      await tx.execute(
        `INSERT INTO schema_migrations (id, applied_at) VALUES (${escapeLiteral(
          file
        )}, ${escapeLiteral(appliedAt)})`
      );
    });

    appliedThisRun.push(file);
  }

  return appliedThisRun;
};
