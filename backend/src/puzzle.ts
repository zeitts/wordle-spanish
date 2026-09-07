import { PERMUTATION_SEED } from "./config.js";
import { dayNumber } from "./date.js";
import { permutation } from "./permutation.js";
import type { PuzzleRecord, PuzzleStore } from "./store.js";
import { SOLUTIONS } from "./words.js";

let cachedPermutation: number[] | null = null;

function perm(): number[] {
  if (!cachedPermutation) {
    cachedPermutation = permutation(SOLUTIONS.length, PERMUTATION_SEED);
  }
  return cachedPermutation;
}

// Deterministic word for a date. Walking a permutation in order means:
//  - no repeat for a full cycle of SOLUTIONS.length days, and
//  - consecutive days are always different words.
export function computePuzzle(date: string): PuzzleRecord {
  const n = SOLUTIONS.length;
  const dn = dayNumber(date);
  const slot = ((dn % n) + n) % n;
  const wordIndex = perm()[slot]!;
  return {
    date,
    word: SOLUTIONS[wordIndex]!,
    wordIndex,
    dayNumber: dn,
    createdAt: new Date().toISOString(),
  };
}

// Authoritative lookup: an already-stored day keeps its word even if the word
// list or seed later changes.
export async function getOrCreatePuzzle(
  store: PuzzleStore,
  date: string,
): Promise<PuzzleRecord> {
  const existing = await store.get(date);
  if (existing) return existing;
  return store.putIfAbsent(computePuzzle(date));
}

// For tests / debugging: the full sequence of words for day 0..count-1.
export function puzzleSequence(count: number): string[] {
  const n = SOLUTIONS.length;
  const p = perm();
  return Array.from({ length: count }, (_, d) => SOLUTIONS[p[((d % n) + n) % n]!]!);
}
