import { describe, expect, it } from "vitest";
import { applyGuess, freshGame, rows, shareGrid } from "./game";

describe("applyGuess", () => {
  it("wins on the correct word", () => {
    const s = applyGuess(freshGame("2026-01-01"), "gatos", "gatos");
    expect(s.status).toBe("won");
    expect(s.guesses).toEqual(["gatos"]);
  });

  it("loses after six wrong guesses", () => {
    let s = freshGame("2026-01-01");
    for (let i = 0; i < 6; i++) s = applyGuess(s, "perro", "gatos");
    expect(s.status).toBe("lost");
    expect(s.guesses).toHaveLength(6);
  });

  it("ignores guesses once finished", () => {
    const won = applyGuess(freshGame("d"), "gatos", "gatos");
    expect(applyGuess(won, "perro", "gatos")).toBe(won);
  });
});

describe("rows", () => {
  it("returns six rows with the draft on the active line", () => {
    const grid = rows(freshGame("d"), "gatos", "ga");
    expect(grid).toHaveLength(6);
    expect(grid[0]!.letters).toEqual(["g", "a", "", "", ""]);
    expect(grid[0]!.states).toBeNull();
  });

  it("shows evaluated states for submitted rows", () => {
    const s = applyGuess(freshGame("d"), "perro", "gatos");
    const grid = rows(s, "gatos", "");
    expect(grid[0]!.states).not.toBeNull();
    expect(grid[1]!.letters).toEqual(["", "", "", "", ""]);
  });
});

describe("shareGrid", () => {
  it("renders one line of squares per guess", () => {
    const s = applyGuess(freshGame("d"), "gatos", "gatos");
    const lines = shareGrid(s, "gatos").split("\n");
    expect(lines).toHaveLength(1);
    expect([...lines[0]!]).toHaveLength(5);
  });
});
