import { MAX_GUESSES, WORD_LENGTH } from "./config.js";
import {
  isBeforeLaunch,
  isFutureDate,
  isoDateInTZ,
  isValidDateString,
} from "./date.js";
import {
  bearerFrom,
  checkPassword,
  createToken,
  verifyToken,
} from "./auth.js";
import { normalize } from "./normalize.js";
import { getOrCreatePuzzle } from "./puzzle.js";
import type { PuzzleStore } from "./store.js";
import type { SecretProvider } from "./secrets.js";
import { VALID_GUESSES } from "./words.js";

// Minimal subset of the Lambda Function URL (payload format 2.0) event.
export interface HttpEvent {
  requestContext: { http: { method: string; path: string } };
  rawPath?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}

export interface HttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface Deps {
  store: PuzzleStore;
  secrets: SecretProvider;
}

const json = (statusCode: number, data: unknown): HttpResult => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(data),
});

function readBody(event: HttpEvent): unknown {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function headerValue(
  headers: Record<string, string | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key ? headers[key] : undefined;
}

export async function handleRequest(
  event: HttpEvent,
  deps: Deps,
): Promise<HttpResult> {
  const method = event.requestContext?.http?.method ?? "GET";
  const rawPath = event.rawPath ?? event.requestContext?.http?.path ?? "/";
  // CloudFront forwards the full path; tolerate an optional /api prefix.
  const path = rawPath.replace(/^\/api(?=\/|$)/, "") || "/";
  const query = event.queryStringParameters ?? {};

  try {
    if (method === "POST" && path === "/auth") {
      const { password } = readBody(event) as { password?: unknown };
      if (typeof password !== "string") {
        return json(400, { error: "password required" });
      }
      const actual = await deps.secrets.password();
      if (!checkPassword(password, actual)) {
        return json(401, { error: "wrong password" });
      }
      const token = createToken(await deps.secrets.tokenSecret());
      return json(200, { token });
    }

    // Everything below requires a valid token.
    const token = bearerFrom(headerValue(event.headers, "authorization"));
    if (!token || !verifyToken(token, await deps.secrets.tokenSecret())) {
      return json(401, { error: "unauthorized" });
    }

    if (method === "GET" && path === "/puzzle") {
      const date = (query.date as string | undefined) ?? isoDateInTZ();
      if (!isValidDateString(date)) {
        return json(400, { error: "invalid date" });
      }
      if (isFutureDate(date)) {
        return json(403, { error: "that day has not happened yet" });
      }
      if (isBeforeLaunch(date)) {
        return json(404, { error: "the game did not exist yet on that day" });
      }
      const record = await getOrCreatePuzzle(deps.store, date);
      return json(200, {
        date: record.date,
        dayNumber: record.dayNumber,
        word: record.word,
        length: WORD_LENGTH,
        maxGuesses: MAX_GUESSES,
      });
    }

    if (method === "GET" && path === "/history") {
      const dates = await deps.store.listDates();
      return json(200, { today: isoDateInTZ(), dates });
    }

    if (method === "GET" && path === "/dictionary") {
      return json(200, { length: WORD_LENGTH, words: VALID_GUESSES });
    }

    if (method === "POST" && path === "/validate") {
      const { guess } = readBody(event) as { guess?: unknown };
      const normalized = typeof guess === "string" ? normalize(guess) : "";
      const valid =
        normalized.length === WORD_LENGTH &&
        new Set(VALID_GUESSES).has(normalized);
      return json(200, { valid, normalized });
    }

    return json(404, { error: "not found" });
  } catch (err) {
    console.error("handler error", err);
    return json(500, { error: "internal error" });
  }
}
