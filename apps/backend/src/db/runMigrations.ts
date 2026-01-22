import { createDatabaseAdapter } from "./adapter";
import { runMigrations } from "./migrations";

const run = async (): Promise<void> => {
  const adapter = await createDatabaseAdapter();
  try {
    const applied = await runMigrations(adapter);
    if (applied.length === 0) {
      console.log("No new migrations to apply.");
    } else {
      console.log(`Applied migrations: ${applied.join(", ")}`);
    }
  } finally {
    await adapter.close();
  }
};

run().catch((error) => {
  console.error("Migration failed", error);
  process.exitCode = 1;
});
