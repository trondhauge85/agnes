export type DatabaseProvider = "sqlite" | "postgres";

export type DatabaseConfig = {
  provider: DatabaseProvider;
  sqlitePath: string | null;
  connectionString: string | null;
};

const parseProvider = (value: string | undefined): DatabaseProvider => {
  if (value === "postgres") {
    return "postgres";
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
      connectionString
    };
  }

  return {
    provider,
    sqlitePath: process.env.SQLITE_PATH ?? "data/agnes.sqlite",
    connectionString: null
  };
};
