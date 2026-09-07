// Local dev server: runs the real handler with an in-memory store and
// env-var secrets so the frontend is fully playable without deploying.
//
//   npm run dev            (in backend/)
//   WORDLE_PASSWORD=hunter2 npm run dev
//
// Vite proxies /api -> http://localhost:8787

import { createServer } from "node:http";
import { handleRequest, type HttpEvent } from "./handler.js";
import { MemoryPuzzleStore } from "./store.js";
import { EnvSecretProvider } from "./secrets.js";

const PORT = Number(process.env.PORT ?? 8787);
const deps = {
  store: new MemoryPuzzleStore(),
  secrets: new EnvSecretProvider(),
};

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c as Buffer));
  req.on("end", async () => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));

    const event: HttpEvent = {
      requestContext: { http: { method: req.method ?? "GET", path: url.pathname } },
      rawPath: url.pathname,
      queryStringParameters: query,
      headers: req.headers as Record<string, string | undefined>,
      body: chunks.length ? Buffer.concat(chunks).toString("utf8") : null,
      isBase64Encoded: false,
    };

    const result = await handleRequest(event, deps);
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
    console.log(req.method, url.pathname, "->", result.statusCode);
  });
});

server.listen(PORT, () => {
  const secrets = deps.secrets as EnvSecretProvider;
  secrets.password().then((pw) => {
    console.log(`local backend on http://localhost:${PORT}  (password: ${pw})`);
  });
});
