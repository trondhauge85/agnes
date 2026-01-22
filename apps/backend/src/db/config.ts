export type DatabaseProvider = "sqlite" | "postgres" | "d1";

export type D1Database = {
  prepare: (query: string) => {
    all: () => Promise<{ results: Record<string, unknown>[] }>;
    run: () => Promise<unknown>;
  };
  exec: (query: string) => Promise<unknown>;
};

export type DatabaseConfig = {
  provider: DatabaseProvider;
  sqlitePath: string | null;
  connectionString: string | null;
  d1Database: D1Database | null;
};

const parseProvider = (value: string | undefined): DatabaseProvider => {
  if (value === "postgres") {
    return "postgres";
  }
  if (value === "d1") {
    return "d1";
  }
  return "sqlite";
};

export const loadDatabaseConfig = (): DatabaseConfig => {
  const provider = parseProvider(process.env.DB_PROVIDER);

  if (provider === "postgres") {
    const connectionString =
      process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;

    if (!connectionString) {
      throw new Error(
        "Missing DATABASE_URL/POSTGRES_URL for postgres database configuration."
      );
    }

    return {
      provider,
      sqlitePath: null,
      connectionString,
      d1Database: null
    };
  }

  if (provider === "d1") {
    return {
      provider,
      sqlitePath: null,
      connectionString: null,
      d1Database: null
    };
  }

  return {
    provider,
    sqlitePath: process.env.SQLITE_PATH ?? "data/agnes.sqlite",
    connectionString: null,
    d1Database: null
  };
};
