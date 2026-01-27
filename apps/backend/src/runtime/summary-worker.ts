import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGeminiProvider, NullLlmProvider } from "../llm";
import { createFamilySummaryLlmService } from "../workers/summary/summaryLlm";
import { createSummaryWorker } from "../workers/summary/summaryWorker";

const __dirname = dirname(fileURLToPath(import.meta.url));

const findEnvPath = (): string | null => {
  const candidates = [process.cwd(), __dirname];
  for (const start of candidates) {
    let current = start;
    while (true) {
      const candidate = resolve(current, ".env");
      if (existsSync(candidate)) {
        return candidate;
      }
      const parent = resolve(current, "..");
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }
  return null;
};

const envPath = findEnvPath();
loadEnv(envPath ? { path: envPath } : undefined);

const usage = `Usage: pnpm --filter @agnes/backend summary:worker <daily|weekly> [options]

Options:
  -f, --family <id>  Run summary for a single family ID
  -h, --help         Show help

Examples:
  pnpm --filter @agnes/backend summary:worker daily
  pnpm --filter @agnes/backend summary:worker weekly --family fam_123
`;

type SummaryMode = "daily" | "weekly";

const parseArgs = (argv: string[]): { mode: SummaryMode; familyId?: string } => {
  let mode: SummaryMode | null = null;
  let familyId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      console.log(usage);
      process.exit(0);
    }

    if (arg === "-f" || arg === "--family") {
      const next = argv[index + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Expected a family id after --family.");
      }
      familyId = next;
      index += 1;
      continue;
    }

    if (arg === "daily" || arg === "weekly") {
      if (mode) {
        throw new Error("Only one mode is allowed (daily or weekly).");
      }
      mode = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!mode) {
    throw new Error("Missing required mode (daily or weekly).\n\n" + usage);
  }

  return { mode, familyId };
};

const main = async (): Promise<void> => {
  const { mode, familyId } = parseArgs(process.argv.slice(2));

  const provider = process.env.GEMINI_API_KEY
    ? createGeminiProvider({
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL,
        apiBaseUrl: process.env.GEMINI_API_BASE_URL
      })
    : new NullLlmProvider();

  const llmService = createFamilySummaryLlmService(provider);
  const worker = createSummaryWorker({ llmService });

  if (mode === "daily") {
    if (familyId) {
      await worker.runDailySummaryForFamily(familyId);
    } else {
      await worker.runDailySummaries();
    }
    return;
  }

  if (familyId) {
    await worker.runWeeklySummaryForFamily(familyId);
  } else {
    await worker.runWeeklySummaries();
  }
};

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(message);
  process.exit(1);
}
