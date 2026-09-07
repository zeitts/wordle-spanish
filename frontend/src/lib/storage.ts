import type { GameState } from "./game";

const TOKEN_KEY = "wordle-es:token";
const SESSION_PREFIX = "wordle-es:session:";
const DICT_KEY = "wordle-es:dictionary";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota - ignore */
  }
}
function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const tokenStore = {
  get: () => safeGet(TOKEN_KEY),
  set: (t: string) => safeSet(TOKEN_KEY, t),
  clear: () => safeRemove(TOKEN_KEY),
};

export const sessionStore = {
  load(date: string): GameState | null {
    const raw = safeGet(SESSION_PREFIX + date);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  },
  save(state: GameState): void {
    safeSet(SESSION_PREFIX + state.date, JSON.stringify(state));
  },
  clear(date: string): void {
    safeRemove(SESSION_PREFIX + date);
  },
};

export const dictionaryCache = {
  load(): string[] | null {
    const raw = safeGet(DICT_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  save(words: string[]): void {
    safeSet(DICT_KEY, JSON.stringify(words));
  },
};
