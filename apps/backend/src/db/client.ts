import type { DatabaseAdapter } from "./adapter";
import { createDatabaseAdapter } from "./adapter";
import { runMigrations } from "./migrations";

let adapterPromise: Promise<DatabaseAdapter> | null = null;
let migrationsPromise: Promise<void> | null = null;

export const getDatabaseAdapter = async (): Promise<DatabaseAdapter> => {
  if (!adapterPromise) {
    adapterPromise = createDatabaseAdapter();
  }

  if (!migrationsPromise) {
    migrationsPromise = adapterPromise.then(async (adapter) => {
      await runMigrations(adapter);
    });
  }

  await migrationsPromise;
  return adapterPromise;
};
