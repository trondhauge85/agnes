import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { Readable } from "node:stream";

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

const { default: worker } = await import("./worker");

const port = Number(process.env.PORT ?? 3011);
const env = process.env as Record<string, string>;
const ctx = {
  waitUntil(promise: Promise<unknown>) {
    promise.catch((error) => {
      console.error("Worker background task failed", error);
    });
  }
};

const server = createServer(async (req, res) => {
  const origin = `http://${req.headers.host ?? "localhost"}`;
  const url = new URL(req.url ?? "/", origin);
  const method = req.method ?? "GET";
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(","));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const body = method === "GET" || method === "HEAD" ? undefined : req;
  const request = new Request(url, {
    method,
    headers,
    body,
    duplex: body ? "half" : undefined
  });

  const response = await worker.fetch(request, env, ctx);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
  } else {
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Worker listening on http://localhost:${port}`);
});
