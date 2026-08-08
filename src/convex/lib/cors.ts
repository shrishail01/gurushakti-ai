/**
 * CORS + JSON response helpers — pure module (no Node APIs), safe for the
 * V8 http.ts router. The frontend (freebuff preview origin) calls the Convex
 * deployment cross-origin with credentials, so we reflect the request Origin
 * (never `*` with credentials) and answer OPTIONS preflight explicitly.
 */

import { ConvexError } from "convex/values";
import { ApiError, type HttpErrorShape } from "./errors";

export function getRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin || !/^https?:\/\//.test(origin)) return null;
  return origin;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = getRequestOrigin(request);
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Credentials": origin ? "true" : "false",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

export function errorResponse(request: Request, error: unknown): Response {
  let status = 500;
  let message = "Unexpected server error. Please try again.";

  if (error instanceof ConvexError && error.data && typeof error.data === "object") {
    const data = error.data as HttpErrorShape;
    if (typeof data.status === "number") status = data.status;
    if (typeof data.message === "string") message = data.message;
  } else if (error instanceof ApiError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
    const statusValue = (error as Error & { status?: unknown }).status;
    if (typeof statusValue === "number") status = statusValue;
  }

  return jsonResponse(request, { error: message }, status);
}

export function optionsHandler(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
