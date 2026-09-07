import { describe, expect, it } from "vitest";
import { evaluate, keyboardStates } from "./evaluate";

describe("evaluate", () => {
  it("marks an exact match all correct", () => {
    expect(evaluate("gatos", "gatos")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("marks misplaced letters present", () => {
    // target "cauce": guess "calle" -> c correct, a correct, l/l absent, e correct
    expect(evaluate("calle", "cauce")).toEqual([
      "correct",
      "correct",
      "absent",
      "absent",
      "correct",
    ]);
  });

  it("does not over-count duplicates in the guess", () => {
    // target "perro" has two r; guess "arras": a absent, r present, r correct, a absent, s absent
    expect(evaluate("arras", "perro")).toEqual([
      "absent",
      "present",
      "correct",
      "absent",
      "absent",
    ]);
  });

  it("caps present marks at the target count", () => {
    // target "abeja" one a-at-0 and a-at-4; guess "aaaaa" -> pos0 correct, pos4 correct, rest absent
    expect(evaluate("aaaaa", "abeja")).toEqual([
      "correct",
      "absent",
      "absent",
      "absent",
      "correct",
    ]);
  });
});

describe("keyboardStates", () => {
  it("keeps the best state seen per letter", () => {
    const states = keyboardStates(["arras", "perro"], "perro");
    expect(states["r"]).toBe("correct");
    expect(states["a"]).toBe("absent");
    expect(states["p"]).toBe("correct");
  });
});
