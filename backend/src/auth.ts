import { createHmac, timingSafeEqual } from "node:crypto";
import { TOKEN_TTL_SECONDS } from "./config.js";

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface TokenPayload {
  sub: "player";
  iat: number;
  exp: number;
}

// Compact HS256 token (same wire shape as a JWT).
export function createToken(secret: string, now: number = Date.now()): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: "player", iat, exp: iat + TOKEN_TTL_SECONDS }),
  ).toString("base64url");
  return `${header}.${payload}.${sign(`${header}.${payload}`, secret)}`;
}

export function verifyToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, sig] = parts as [string, string, string];
  if (!safeEqual(sig, sign(`${header}.${payload}`, secret))) return false;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Partial<TokenPayload>;
    return typeof decoded.exp === "number" && decoded.exp * 1000 > now;
  } catch {
    return false;
  }
}

export function checkPassword(input: string, actual: string): boolean {
  return safeEqual(input, actual);
}

export function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? (m[1] as string) : null;
}
