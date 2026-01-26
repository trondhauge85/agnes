import "dotenv/config";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { handler } from "../router";

const port = Number(process.env.PORT ?? 3000);

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

  const response = await handler(request);

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
  console.log(`Backend listening on http://localhost:${port}`);
});
