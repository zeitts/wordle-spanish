import { describe, expect, it } from "vitest";
import {
  dayNumber,
  isBeforeLaunch,
  isValidDateString,
  isoDateInTZ,
} from "../src/date.js";

describe("dayNumber", () => {
  it("is 0 at the epoch (launch day)", () => {
    expect(dayNumber("2026-09-07")).toBe(0);
  });
  it("counts whole days forward", () => {
    expect(dayNumber("2026-09-08")).toBe(1);
    expect(dayNumber("2027-09-07")).toBe(365);
  });
  it("goes negative before the epoch", () => {
    expect(dayNumber("2026-09-06")).toBe(-1);
  });
  it("is unaffected by DST boundaries", () => {
    // US falls back on 2026-11-01.
    expect(dayNumber("2026-11-02") - dayNumber("2026-10-31")).toBe(2);
  });
});

describe("isBeforeLaunch", () => {
  it("rejects days before the game existed", () => {
    expect(isBeforeLaunch("2026-09-06")).toBe(true);
    expect(isBeforeLaunch("2026-01-01")).toBe(true);
  });
  it("accepts launch day and later", () => {
    expect(isBeforeLaunch("2026-09-07")).toBe(false);
    expect(isBeforeLaunch("2026-12-25")).toBe(false);
  });
});

describe("isValidDateString", () => {
  it("accepts real dates", () => {
    expect(isValidDateString("2026-09-07")).toBe(true);
  });
  it("rejects nonsense", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("2026-9-7")).toBe(false);
  });
});

describe("isoDateInTZ", () => {
  it("formats YYYY-MM-DD", () => {
    expect(isoDateInTZ(new Date("2026-06-15T12:00:00Z"))).toBe("2026-06-15");
  });
  it("respects the timezone around midnight", () => {
    // 02:00 UTC on the 16th is still the 15th in New York (UTC-4 in summer).
    expect(
      isoDateInTZ(new Date("2026-06-16T02:00:00Z"), "America/New_York"),
    ).toBe("2026-06-15");
  });
});
