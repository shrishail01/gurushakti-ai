import jwt from "jsonwebtoken";
import type { Request } from "express";
import dotenv from "dotenv";

dotenv.config();

export const TOKEN_COOKIE = "gs_token";
export const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days in ms
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not configured in environment variables.");
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

/** Extract the JWT from the gs_token cookie or Authorization: Bearer header. */
export function extractToken(req: Request): string | null {
  // Check cookies first
  const cookieToken = req.cookies?.[TOKEN_COOKIE];
  if (cookieToken) return cookieToken;

  // Fallback to Bearer token header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return null;
}

/** Strip sensitive fields before sending the user to the client. */
export function publicUser(user: any): any {
  const { hashedPassword, lastActiveDate, ...rest } = user;
  return rest;
}
