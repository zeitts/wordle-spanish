import { evaluate, type LetterState } from "./evaluate";

export const MAX_GUESSES = 6;
export const WORD_LENGTH = 5;

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  date: string;
  guesses: string[]; // normalized, submitted guesses
  status: GameStatus;
}

export interface Puzzle {
  date: string;
  word: string; // normalized solution
  dayNumber: number;
}

export function freshGame(date: string): GameState {
  return { date, guesses: [], status: "playing" };
}

export function applyGuess(state: GameState, guess: string, target: string): GameState {
  if (state.status !== "playing" || state.guesses.length >= MAX_GUESSES) {
    return state;
  }
  const guesses = [...state.guesses, guess];
  let status: GameStatus = "playing";
  if (guess === target) status = "won";
  else if (guesses.length >= MAX_GUESSES) status = "lost";
  return { ...state, guesses, status };
}

export interface Row {
  letters: string[];
  states: LetterState[] | null; // null = not submitted yet
}

// Build the 6 rows to render, given the game and the in-progress input.
export function rows(state: GameState, target: string, draft: string): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const submitted = state.guesses[i];
    if (submitted !== undefined) {
      out.push({
        letters: submitted.split(""),
        states: evaluate(submitted, target),
      });
    } else if (i === state.guesses.length && state.status === "playing") {
      const letters = draft.split("");
      while (letters.length < WORD_LENGTH) letters.push("");
      out.push({ letters, states: null });
    } else {
      out.push({ letters: Array(WORD_LENGTH).fill(""), states: null });
    }
  }
  return out;
}

// Emoji grid for the share sheet.
export function shareGrid(state: GameState, target: string): string {
  const glyph: Record<LetterState, string> = {
    correct: "\u{1F7E9}",
    present: "\u{1F7E8}",
    absent: "\u{2B1B}",
  };
  return state.guesses
    .map((g) => evaluate(g, target).map((s) => glyph[s]).join(""))
    .join("\n");
}
