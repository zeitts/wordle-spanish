import solutions from "./words.json" with { type: "json" };
import validGuesses from "./valid-guesses.json" with { type: "json" };

// Daily solutions, ~1000 five-letter words, sorted, normalized.
export const SOLUTIONS: readonly string[] = solutions as string[];

// Every word accepted as a guess (superset of SOLUTIONS).
export const VALID_GUESSES: readonly string[] = validGuesses as string[];

const validSet = new Set(VALID_GUESSES);

export function isValidGuess(word: string): boolean {
  return validSet.has(word);
}
