import { describe, expect, it } from "vitest";
import { computePuzzle, getOrCreatePuzzle, puzzleSequence } from "../src/puzzle.js";
import { SOLUTIONS } from "../src/words.js";
import { MemoryPuzzleStore, type PuzzleStore } from "../src/store.js";
import { dayNumber } from "../src/date.js";

describe("daily word selection", () => {
  const n = SOLUTIONS.length;

  it("covers every word exactly once over a full cycle", () => {
    const seq = puzzleSequence(n);
    expect(new Set(seq).size).toBe(n);
  });

  it("never repeats the previous day's word", () => {
    const seq = puzzleSequence(n + 50);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });

  it("is deterministic per date", () => {
    expect(computePuzzle("2026-03-14").word).toBe(
      computePuzzle("2026-03-14").word,
    );
  });

  it("handles dates before the epoch", () => {
    const p = computePuzzle("2025-12-01");
    expect(p.dayNumber).toBeLessThan(0);
    expect(SOLUTIONS).toContain(p.word);
  });
});

describe("getOrCreatePuzzle", () => {
  it("freezes a stored day even if the computed word would change", async () => {
    const store: PuzzleStore = new MemoryPuzzleStore();
    await store.putIfAbsent({
      date: "2026-02-02",
      word: "xxxxx",
      wordIndex: -1,
      dayNumber: dayNumber("2026-02-02"),
      createdAt: new Date().toISOString(),
    });
    const got = await getOrCreatePuzzle(store, "2026-02-02");
    expect(got.word).toBe("xxxxx");
  });

  it("creates and persists a new day", async () => {
    const store = new MemoryPuzzleStore();
    const a = await getOrCreatePuzzle(store, "2026-05-05");
    const b = await getOrCreatePuzzle(store, "2026-05-05");
    expect(a).toEqual(b);
    expect(await store.listDates()).toEqual(["2026-05-05"]);
  });
});
