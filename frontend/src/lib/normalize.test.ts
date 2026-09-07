import { describe, expect, it } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("GATOS")).toBe("gatos");
  });

  it("strips accents", () => {
    expect(normalize("canción")).toBe("cancion");
    expect(normalize("ÁÉÍÓÚ")).toBe("aeiou");
    expect(normalize("pingüino")).toBe("pinguino");
  });

  it("keeps the enye as its own letter", () => {
    expect(normalize("AÑOS")).toBe("años");
    expect(normalize("niño")).toBe("niño");
  });

  it("drops spaces and punctuation", () => {
    expect(normalize(" a-b c! ")).toBe("abc");
  });
});
