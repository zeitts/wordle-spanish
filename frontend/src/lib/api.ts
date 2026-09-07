import { dictionaryCache, tokenStore } from "./storage";

const BASE = "/api";

export class AuthError extends Error {}
export class ApiError extends Error {}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    tokenStore.clear();
    throw new AuthError("unauthorized");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : `HTTP ${res.status}`,
    );
  }
  return data as T;
}

export async function login(password: string): Promise<void> {
  const { token } = await request<{ token: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  tokenStore.set(token);
}

export function logout(): void {
  tokenStore.clear();
}

export function hasToken(): boolean {
  return tokenStore.get() !== null;
}

export interface PuzzleResponse {
  date: string;
  dayNumber: number;
  word: string;
  length: number;
  maxGuesses: number;
}

export function fetchPuzzle(date?: string): Promise<PuzzleResponse> {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<PuzzleResponse>(`/puzzle${q}`);
}

export interface HistoryResponse {
  today: string;
  dates: string[];
}

export function fetchHistory(): Promise<HistoryResponse> {
  return request<HistoryResponse>("/history");
}

let dictPromise: Promise<Set<string>> | null = null;

export function loadDictionary(): Promise<Set<string>> {
  if (dictPromise) return dictPromise;
  const cached = dictionaryCache.load();
  if (cached) {
    dictPromise = Promise.resolve(new Set(cached));
    return dictPromise;
  }
  dictPromise = request<{ words: string[] }>("/dictionary").then((r) => {
    dictionaryCache.save(r.words);
    return new Set(r.words);
  });
  return dictPromise;
}
