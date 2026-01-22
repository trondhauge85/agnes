import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { Pool } from "pg";
import { loadDatabaseConfig, type DatabaseConfig, type D1Database } from "./config";

export type DatabaseAdapter = {
  execute: (sql: string) => Promise<void>;
  query: <T = Record<string, unknown>>(sql: string) => Promise<T[]>;
  transaction: <T>(fn: (adapter: DatabaseAdapter) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};

const ensureSqliteDirectory = async (sqlitePath: string): Promise<void> => {
  const directory = path.dirname(sqlitePath);
  try {
    const stats = await stat(directory);
    if (!stats.isDirectory()) {
      throw new Error(`${directory} exists but is not a directory`);
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      await mkdir(directory, { recursive: true });
      return;
    }
    throw error;
  }
};

const createSqliteAdapter = async (sqlitePath: string): Promise<DatabaseAdapter> => {
  await ensureSqliteDirectory(sqlitePath);
  const db = new Database(sqlitePath);

  const adapter: DatabaseAdapter = {
    execute: async (sql) => {
      db.exec(sql);
    },
    query: async (sql) => db.prepare(sql).all() as Record<string, unknown>[],
    transaction: async (fn) => {
      db.exec("BEGIN");
      try {
        const result = await fn(adapter);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close: async () => {
      db.close();
    }
  };

  return adapter;
};

const createPostgresAdapter = (config: DatabaseConfig): DatabaseAdapter => {
  if (!config.connectionString) {
    throw new Error("Postgres adapter requires a connection string.");
  }

  const pool = new Pool({ connectionString: config.connectionString });

  return {
    execute: async (sql) => {
      await pool.query(sql);
    },
    query: async (sql) => {
      const result = await pool.query(sql);
      return result.rows as Record<string, unknown>[];
    },
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const txAdapter: DatabaseAdapter = {
          execute: async (sql) => {
            await client.query(sql);
          },
          query: async (sql) => {
            const result = await client.query(sql);
            return result.rows as Record<string, unknown>[];
          },
          transaction: async (nestedFn) => nestedFn(txAdapter),
          close: async () => undefined
        };

        const result = await fn(txAdapter);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: async () => {
      await pool.end();
    }
  };
};

const createD1Adapter = (database: D1Database | null): DatabaseAdapter => {
  if (!database) {
    throw new Error("D1 adapter requires a bound D1 database.");
  }

  const adapter: DatabaseAdapter = {
    execute: async (sql) => {
      await database.exec(sql);
    },
    query: async (sql) => {
      const result = await database.prepare(sql).all();
      return result.results as Record<string, unknown>[];
    },
    transaction: async (fn) => {
      await adapter.execute("BEGIN");
      try {
        const result = await fn(adapter);
        await adapter.execute("COMMIT");
        return result;
      } catch (error) {
        await adapter.execute("ROLLBACK");
        throw error;
      }
    },
    close: async () => undefined
  };

  return adapter;
};

export const createDatabaseAdapter = async (
  config: DatabaseConfig = loadDatabaseConfig()
): Promise<DatabaseAdapter> => {
  if (config.provider === "postgres") {
    return createPostgresAdapter(config);
  }

  if (config.provider === "d1") {
    return createD1Adapter(config.d1Database);
  }

  if (!config.sqlitePath) {
    throw new Error("SQLite adapter requires SQLITE_PATH.");
  }

  return createSqliteAdapter(config.sqlitePath);
};
