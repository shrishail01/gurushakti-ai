"use node";

/**
 * JWT sign/verify helpers — Node runtime only (jsonwebtoken).
 * The secret lives server-side only (process.env.JWT_SECRET, set in the
 * project Keys/API-keys UI — never exposed to the frontend).
 */

import jwt from "jsonwebtoken";
import { TOKEN_MAX_AGE_SECONDS } from "./session";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret.trim();
}

export function signToken(userId: string): string {
  return jwt.sign({}, getSecret(), {
    subject: userId,
    expiresIn: TOKEN_MAX_AGE_SECONDS,
  });
}

/** Returns the userId if the token is valid, otherwise null. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "string") return payload;
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
