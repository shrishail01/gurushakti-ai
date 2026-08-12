/**
 * HTTP router — V8 runtime only (http.ts cannot use "use node").
 *
 * Thin handlers here parse requests, handle CORS, and delegate all
 * Node-runtime work (MongoDB, bcrypt, JWT, income) to "use node" internal
 * actions via ctx.runAction. The Gemini streaming request itself is made
 * from this file (fetch works in the V8 runtime) so text can stream to the
 * client incrementally; only the final save + stats go through the Node
 * action in generateApi.ts.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { z } from "zod";
import { auth } from "./auth";
import {
  corsHeaders,
  jsonResponse,
  errorResponse,
  optionsHandler,
} from "./lib/cors";
import { rateLimit } from "./lib/rateLimit";
import {
  extractToken,
  cookieHeaderValue,
  clearCookieHeaderValue,
} from "./lib/session";
import { ApiError } from "./lib/errors";
import { getTool, buildToolPrompt, buildDocumentTitle } from "../lib/tools";
import type {
  OutputLanguage,
  ProfileContext,
  UserProfile,
} from "../lib/types";

const http = httpRouter();

// Existing Convex Auth routes (email OTP etc.) — do not remove.
auth.addHttpRoutes(http);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function cookieResponse(request: Request, body: unknown, token: string) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeaderValue(token),
      ...corsHeaders(request),
    },
  });
}

/** Remove the invisible "<!-- IMG: ... -->" markers used by the PPT tool
 *  before persisting, so saved documents stay clean. */
function stripPptImageMarkers(content: string): string {
  return content
    .replace(/<!--\s*IMG:[\s\S]*?-->/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

async function requireAuth(ctx: Parameters<Parameters<typeof httpAction>[0]>[0], request: Request) {
  const token = extractToken(request);
  return ctx.runAction(internal.usersApi.authenticateUser, { token });
}

function profileFromUser(user: UserProfile): ProfileContext {
  return {
    name: user.name,
    role: user.role,
    teachingLevel: user.teachingLevel,
    subjects: user.subjects,
    district: user.district,
    digitalSkillLevel: user.digitalSkillLevel,
  };
}

const generateSchema = z.object({
  toolId: z.string().min(1).max(64),
  parameters: z.record(z.string(), z.string()).default({}),
  outputLanguage: z.enum(["en", "kn", "both"]).default("en"),
});

/* ------------------------------------------------------------------ */
/* Auth routes                                                         */
/* ------------------------------------------------------------------ */

export const register = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const limited = rateLimit(`register:${clientIp(request)}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      throw new ApiError(429, "Too many sign-up attempts. Please try again later.");
    }
    const raw = (await request.json().catch(() => {
      throw new ApiError(400, "Invalid request body.");
    })) as { name?: unknown; email?: unknown; password?: unknown };
    const result = await ctx.runAction(internal.usersApi.registerUser, {
      name: typeof raw.name === "string" ? raw.name : "",
      email: typeof raw.email === "string" ? raw.email : "",
      password: typeof raw.password === "string" ? raw.password : "",
    });
    return cookieResponse(request, { user: result.user, token: result.token }, result.token);
  } catch (error) {
    return errorResponse(request, error);
  }
});

export const login = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const raw = (await request.json().catch(() => {
      throw new ApiError(400, "Invalid request body.");
    })) as { email?: unknown; password?: unknown };
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    const password = typeof raw.password === "string" ? raw.password : "";

    const limited = rateLimit(`login:${clientIp(request)}:${email}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      throw new ApiError(429, "Too many sign-in attempts. Please try again later.");
    }

    const result = await ctx.runAction(internal.usersApi.loginUser, { email, password });
    return cookieResponse(request, { user: result.user, token: result.token }, result.token);
  } catch (error) {
    return errorResponse(request, error);
  }
});

export const logout = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearCookieHeaderValue(),
        ...corsHeaders(request),
      },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});

export const me = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    return jsonResponse(request, { user: auth.user });
  } catch (error) {
    return errorResponse(request, error);
  }
});

export const updateProfile = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const patch = (await request.json().catch(() => {
      throw new ApiError(400, "Invalid request body.");
    })) as Record<string, unknown>;
    const result = await ctx.runAction(internal.usersApi.updateUserProfile, {
      userId: auth.userId,
      patch: JSON.parse(JSON.stringify(patch ?? {})),
    });
    return jsonResponse(request, { user: result.user });
  } catch (error) {
    return errorResponse(request, error);
  }
});

/* ------------------------------------------------------------------ */
/* Generate (Gemini streaming)                                         */
/* ------------------------------------------------------------------ */

interface GenerationOptions {
  userId: string;
  prompt: string;
  title: string;
  toolId: string;
  parameters: Record<string, string>;
}

async function runGeneration(
  controller: ReadableStreamDefaultController<Uint8Array>,
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  opts: GenerationOptions,
) {
  const encoder = new TextEncoder();
  const send = (data: Record<string, unknown>) => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // stream closed by the client
    }
  };

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "") {
      throw new ApiError(
        500,
        "GEMINI_API_KEY is not configured yet. Add it in the project Keys/API-keys settings, then try again.",
      );
    }
    // gemini-2.0-flash was shut down June 1, 2026 — default to a current
    // model with a 65,536-token output budget so long (incl. bilingual)
    // documents are never truncated. GEMINI_MODEL overrides if set.
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key.trim())}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are GuruShakti AI, an expert AI assistant for school teachers in Karnataka, India. You create practical, high-quality teaching materials in clean Markdown. You write in simple, respectful, professional English and/or Kannada as requested. Never fabricate facts; use placeholders like [Name] and [Date] when details are unknown. Keep outputs immediately usable in a real classroom.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 65536 },
      }),
      signal: AbortSignal.timeout(240_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiError(502, `Gemini API error (${res.status}). ${text.slice(0, 200)}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new ApiError(502, "Gemini returned no content stream.");
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const chunk = JSON.parse(data) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const delta = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof delta === "string" && delta.length > 0) {
            content += delta;
            send({ type: "delta", text: delta });
          }
        } catch {
          // skip malformed chunk
        }
      }
    }

    if (!content.trim()) {
      throw new ApiError(502, "Gemini returned an empty response. Please try again.");
    }

    const saved = await ctx.runAction(internal.generateApi.saveGeneratedDocument, {
      userId: opts.userId,
      toolId: opts.toolId,
      title: opts.title,
      content: stripPptImageMarkers(content),
      parameters: opts.parameters,
    });
    send({ type: "done", documentId: saved.documentId, title: saved.title, stats: saved.stats });
  } catch (error) {
    send({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Generation failed. Please try again.",
    });
  } finally {
    try {
      controller.close();
    } catch {
      // already closed
    }
  }
}

export const generate = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);

    const limited = rateLimit(`generate:${auth.userId}`, 30, 60_000);
    if (!limited.ok) {
      throw new ApiError(
        429,
        "You've generated a lot recently. Please wait a moment and try again.",
      );
    }

    const raw = (await request.json().catch(() => {
      throw new ApiError(400, "Invalid request body.");
    })) as Record<string, unknown>;
    const parsed = generateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    const { toolId, parameters, outputLanguage } = parsed.data;

    const tool = getTool(toolId);
    if (!tool) throw new ApiError(404, "Tool not found.");

    for (const field of tool.fields) {
      if (field.required && !parameters[field.name]?.trim()) {
        throw new ApiError(400, `"${field.label}" is required.`);
      }
    }

    const prompt = buildToolPrompt(
      tool,
      parameters,
      profileFromUser(auth.user),
      outputLanguage,
    );
    const title = buildDocumentTitle(tool, parameters);

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) =>
        runGeneration(controller, ctx, {
          userId: auth.userId,
          prompt,
          title,
          toolId,
          parameters,
        }),
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders(request),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});

/* ------------------------------------------------------------------ */
/* Income Engine                                                       */
/* ------------------------------------------------------------------ */

export const income = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const limited = rateLimit(`income:${auth.userId}`, 10, 60_000);
    if (!limited.ok) {
      throw new ApiError(429, "Please wait a moment before generating again.");
    }
    const result = await ctx.runAction(internal.incomeApi.generateIncome, {
      userId: auth.userId,
    });
    return jsonResponse(request, result);
  } catch (error) {
    return errorResponse(request, error);
  }
});

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

function docIdFromUrl(request: Request): { id: string; sub?: string } {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // /api/documents/:id[/favorite]
  const id = parts[2] ?? "";
  const sub = parts[3];
  if (!id) throw new ApiError(404, "Document not found.");
  return { id, sub };
}

export const listDocuments = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "9", 10) || 9),
    );
    const q = (url.searchParams.get("q") ?? "").trim();
    const favoritesOnly = url.searchParams.get("favorites") === "1";

    const result = await ctx.runAction(internal.documentsApi.listDocuments, {
      userId: auth.userId,
      page,
      limit,
      q,
      favoritesOnly,
    });
    return jsonResponse(request, result);
  } catch (error) {
    return errorResponse(request, error);
  }
});

export const getDocument = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const { id } = docIdFromUrl(request);
    const result = await ctx.runAction(internal.documentsApi.getDocument, {
      userId: auth.userId,
      id,
    });
    return jsonResponse(request, result);
  } catch (error) {
    return errorResponse(request, error);
  }
});

const favoriteSchema = z.object({ favorited: z.boolean() });

export const favoriteDocument = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const { id, sub } = docIdFromUrl(request);
    if (sub !== "favorite") throw new ApiError(404, "Document not found.");

    const raw = (await request.json().catch(() => {
      throw new ApiError(400, "Invalid request body.");
    })) as Record<string, unknown>;
    const parsed = favoriteSchema.safeParse(raw);
    if (!parsed.success) throw new ApiError(400, "Invalid request body.");

    const result = await ctx.runAction(internal.documentsApi.favoriteDocument, {
      userId: auth.userId,
      id,
      favorited: parsed.data.favorited,
    });
    return jsonResponse(request, result);
  } catch (error) {
    return errorResponse(request, error);
  }
});

export const deleteDocument = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const { id } = docIdFromUrl(request);
    const result = await ctx.runAction(internal.documentsApi.deleteDocument, {
      userId: auth.userId,
      id,
    });
    return jsonResponse(request, result);
  } catch (error) {
    return errorResponse(request, error);
  }
});

/* ------------------------------------------------------------------ */
/* B.Ed Question Papers                                                */
/* ------------------------------------------------------------------ */

export const listQuestionPapers = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return optionsHandler(request);
  try {
    const auth = await requireAuth(ctx, request);
    const url = new URL(request.url);
    const result = await ctx.runAction(internal.questionPapersApi.listQuestionPapers, {
      q: (url.searchParams.get("q") ?? "").trim().slice(0, 100),
      subject: (url.searchParams.get("subject") ?? "").trim().slice(0, 100),
      semester: (url.searchParams.get("semester") ?? "").trim().slice(0, 20),
      year: (url.searchParams.get("year") ?? "").trim().slice(0, 10),
      university: (url.searchParams.get("university") ?? "").trim().slice(0, 120),
    });
    return jsonResponse(request, result);
  } catch (error) {
    return errorResponse(request, error);
  }
});

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

type HttpActionHandler = ReturnType<typeof httpAction>;
type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiRoute {
  path?: string;
  pathPrefix?: string;
  method: HttpMethod;
  handler: HttpActionHandler;
}

const apiRoutes: ApiRoute[] = [
  { path: "/api/auth/register", method: "POST", handler: register },
  { path: "/api/auth/login", method: "POST", handler: login },
  { path: "/api/auth/logout", method: "POST", handler: logout },
  { path: "/api/auth/me", method: "GET", handler: me },
  { path: "/api/auth/me", method: "PATCH", handler: updateProfile },
  { path: "/api/generate", method: "POST", handler: generate },
  { path: "/api/income", method: "POST", handler: income },
  { path: "/api/documents", method: "GET", handler: listDocuments },
  { pathPrefix: "/api/documents/", method: "GET", handler: getDocument },
  { pathPrefix: "/api/documents/", method: "PATCH", handler: favoriteDocument },
  { pathPrefix: "/api/documents/", method: "DELETE", handler: deleteDocument },
  { path: "/api/question-papers", method: "GET", handler: listQuestionPapers },
];

const registeredOptions = new Set<string>();

for (const route of apiRoutes) {
  if (route.path) {
    http.route({ path: route.path, method: route.method, handler: route.handler });
  } else if (route.pathPrefix) {
    http.route({
      pathPrefix: route.pathPrefix,
      method: route.method,
      handler: route.handler,
    });
  }
  // One OPTIONS (preflight) route per path/prefix — never duplicate.
  const key = route.path ?? route.pathPrefix ?? "";
  if (key && !registeredOptions.has(key)) {
    registeredOptions.add(key);
    const optionsAction = httpAction(async (_ctx, request) => optionsHandler(request));
    if (route.path) {
      http.route({ path: route.path, method: "OPTIONS", handler: optionsAction });
    } else if (route.pathPrefix) {
      http.route({
        pathPrefix: route.pathPrefix,
        method: "OPTIONS",
        handler: optionsAction,
      });
    }
  }
}

export default http;
