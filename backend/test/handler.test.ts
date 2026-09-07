import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest, type Deps, type HttpEvent } from "../src/handler.js";
import { MemoryPuzzleStore } from "../src/store.js";
import { EnvSecretProvider } from "../src/secrets.js";
import { isoDateInTZ } from "../src/date.js";

let deps: Deps;
beforeEach(() => {
  deps = {
    store: new MemoryPuzzleStore(),
    secrets: new EnvSecretProvider("hunter2", "test-secret"),
  };
});

function ev(
  method: string,
  path: string,
  opts: {
    body?: unknown;
    token?: string;
    query?: Record<string, string>;
  } = {},
): HttpEvent {
  return {
    requestContext: { http: { method, path } },
    rawPath: path,
    queryStringParameters: opts.query ?? {},
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    body: opts.body === undefined ? null : JSON.stringify(opts.body),
    isBase64Encoded: false,
  };
}

const parse = (r: { body: string }) => JSON.parse(r.body);

async function login(): Promise<string> {
  const res = await handleRequest(
    ev("POST", "/api/auth", { body: { password: "hunter2" } }),
    deps,
  );
  return parse(res).token as string;
}

describe("auth", () => {
  it("rejects a wrong password", async () => {
    const res = await handleRequest(
      ev("POST", "/api/auth", { body: { password: "nope" } }),
      deps,
    );
    expect(res.statusCode).toBe(401);
  });

  it("issues a working token", async () => {
    const token = await login();
    const res = await handleRequest(ev("GET", "/api/puzzle", { token }), deps);
    expect(res.statusCode).toBe(200);
  });
});

describe("protected routes", () => {
  it("401 without a token", async () => {
    const res = await handleRequest(ev("GET", "/api/puzzle"), deps);
    expect(res.statusCode).toBe(401);
  });

  it("returns today's puzzle and persists it", async () => {
    const token = await login();
    const res = await handleRequest(ev("GET", "/api/puzzle", { token }), deps);
    const body = parse(res);
    expect(body.date).toBe(isoDateInTZ());
    expect(body.word).toHaveLength(5);
    expect(await deps.store.listDates()).toEqual([isoDateInTZ()]);
  });

  it("serves the same word for a date on repeat requests", async () => {
    const token = await login();
    const q = { date: isoDateInTZ() };
    const a = parse(await handleRequest(ev("GET", "/api/puzzle", { token, query: q }), deps));
    const b = parse(await handleRequest(ev("GET", "/api/puzzle", { token, query: q }), deps));
    expect(a.word).toBe(b.word);
    expect(a.word).toHaveLength(5);
  });

  it("refuses a future date", async () => {
    const token = await login();
    const res = await handleRequest(
      ev("GET", "/api/puzzle", { token, query: { date: "2999-01-01" } }),
      deps,
    );
    expect(res.statusCode).toBe(403);
  });

  it("refuses a date before the game launched", async () => {
    const token = await login();
    const res = await handleRequest(
      ev("GET", "/api/puzzle", { token, query: { date: "2026-09-06" } }),
      deps,
    );
    expect(res.statusCode).toBe(404);
  });

  it("rejects a malformed date", async () => {
    const token = await login();
    const res = await handleRequest(
      ev("GET", "/api/puzzle", { token, query: { date: "13-13-13" } }),
      deps,
    );
    expect(res.statusCode).toBe(400);
  });

  it("validates guesses", async () => {
    const token = await login();
    const res = await handleRequest(
      ev("POST", "/api/validate", { token, body: { guess: "zzzzz" } }),
      deps,
    );
    expect(parse(res).valid).toBe(false);
  });

  it("lists history", async () => {
    const token = await login();
    const today = isoDateInTZ();
    await handleRequest(ev("GET", "/api/puzzle", { token, query: { date: today } }), deps);
    const res = await handleRequest(ev("GET", "/api/history", { token }), deps);
    expect(parse(res).dates).toContain(today);
  });
});
