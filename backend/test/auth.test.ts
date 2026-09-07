import { describe, expect, it } from "vitest";
import {
  bearerFrom,
  checkPassword,
  createToken,
  verifyToken,
} from "../src/auth.js";

describe("token", () => {
  const secret = "s3cret";

  it("round-trips", () => {
    expect(verifyToken(createToken(secret), secret)).toBe(true);
  });

  it("fails with the wrong secret", () => {
    expect(verifyToken(createToken(secret), "other")).toBe(false);
  });

  it("rejects an expired token", () => {
    const issued = createToken(secret, Date.parse("2020-01-01"));
    expect(verifyToken(issued, secret, Date.parse("2020-06-01"))).toBe(false);
  });

  it("rejects garbage", () => {
    expect(verifyToken("a.b.c", secret)).toBe(false);
    expect(verifyToken("nope", secret)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("matches exactly", () => {
    expect(checkPassword("abc", "abc")).toBe(true);
    expect(checkPassword("abc", "abcd")).toBe(false);
    expect(checkPassword("abc", "abd")).toBe(false);
  });
});

describe("bearerFrom", () => {
  it("extracts the token", () => {
    expect(bearerFrom("Bearer xyz")).toBe("xyz");
    expect(bearerFrom("bearer xyz")).toBe("xyz");
    expect(bearerFrom(undefined)).toBeNull();
    expect(bearerFrom("Basic xyz")).toBeNull();
  });
});
