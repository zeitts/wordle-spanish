import { describe, expect, it } from "vitest";
import { permutation } from "../src/permutation.js";

describe("permutation", () => {
  it("is deterministic for a given (n, seed)", () => {
    expect(permutation(1000, "wordle-es-v1")).toEqual(
      permutation(1000, "wordle-es-v1"),
    );
  });

  it("changes when the seed changes", () => {
    expect(permutation(1000, "a")).not.toEqual(permutation(1000, "b"));
  });

  it("is an actual permutation of 0..n-1", () => {
    const p = permutation(500, "x");
    expect(p).toHaveLength(500);
    expect([...new Set(p)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 500 }, (_, i) => i),
    );
  });
});
