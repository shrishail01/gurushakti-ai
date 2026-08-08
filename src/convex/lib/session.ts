/**
 * Session helpers — pure module (no Node imports) so the V8 http.ts router
 * can build/parse auth cookies and serialize users without pulling in
 * jsonwebtoken.
 */

import type { UserProfile } from "../../lib/types";

export const TOKEN_COOKIE = "gs_token";
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Set-Cookie header value for the auth cookie (HttpOnly, cross-origin safe). */
export function cookieHeaderValue(
  token: string,
  maxAgeSeconds: number = TOKEN_MAX_AGE_SECONDS,
): string {
  return `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAgeSeconds}`;
}

export function clearCookieHeaderValue(): string {
  return `${TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`;
}

/** Extract the JWT from the gs_token cookie or Authorization: Bearer header. */
export function extractToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`),
  );
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return null;
}

/**
 * Strip sensitive fields before sending the user to the client. Also removes
 * undefined keys so the object is a valid Convex value across runAction.
 */
export function publicUser(
  user: UserProfile & { hashedPassword?: string; lastActiveDate?: string },
): UserProfile {
  const { hashedPassword: _hp, lastActiveDate: _lad, ...rest } = user;
  return JSON.parse(JSON.stringify(rest)) as UserProfile;
}
