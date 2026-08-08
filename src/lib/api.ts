/**
 * Frontend API client for the GuruShakti AI backend (Convex HTTP actions).
 *
 * Auth: the JWT is stored in an HttpOnly cookie by the server. In sandboxed
 * preview iframes where third-party cookies may be blocked, we also keep the
 * token in memory and send it as a Bearer header — the server accepts either.
 */

import type {
  DocumentItem,
  DocumentsResponse,
  IncomeResponse,
  OutputLanguage,
  UserProfile,
} from "./types";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string;
// Convex serves custom HTTP routes (our REST API) on the *.convex.site
// domain, while the *.convex.cloud domain only handles the Convex client
// API (/api/query etc.). Derive the site URL from the deployment URL so
// every /api/* request reaches the HTTP router instead of 404ing.
export const API_BASE = `${CONVEX_URL.replace(/\.convex\.cloud$/, ".convex.site")}/api`;

let memoryToken: string | null = null;

export function setMemoryToken(token: string | null) {
  memoryToken = token;
}

interface ApiErrorShape {
  error?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (memoryToken) headers.set("Authorization", `Bearer ${memoryToken}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let message = res.statusText || "Request failed. Please try again.";
    try {
      const data = (await res.json()) as ApiErrorShape;
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export interface GenerateDone {
  documentId: string;
  title: string;
  stats: {
    documentsGenerated: number;
    timeSavedMinutes: number;
    streakDays: number;
  };
}

/** Stream /api/generate SSE events into the provided callbacks. */
export async function generateStream(params: {
  toolId: string;
  parameters: Record<string, string>;
  outputLanguage: OutputLanguage;
  onDelta: (text: string) => void;
  onDone: (data: GenerateDone) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (memoryToken) headers["Authorization"] = `Bearer ${memoryToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        toolId: params.toolId,
        parameters: params.parameters,
        outputLanguage: params.outputLanguage,
      }),
      signal: params.signal,
    });
  } catch {
    if (params.signal?.aborted) {
      params.onError("Generation stopped.");
    } else {
      params.onError("Network error. Please check your connection and try again.");
    }
    return;
  }

  if (!res.ok) {
    let message = "Generation failed. Please try again.";
    try {
      const data = (await res.json()) as ApiErrorShape;
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    params.onError(message);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    params.onError("No response stream received.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
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
        if (!data) continue;
        try {
          const event = JSON.parse(data) as {
            type: string;
            text?: string;
            message?: string;
            documentId?: string;
            title?: string;
            stats?: GenerateDone["stats"];
          };
          if (event.type === "delta" && typeof event.text === "string") {
            params.onDelta(event.text);
          } else if (event.type === "done" && event.documentId) {
            params.onDone({
              documentId: event.documentId,
              title: event.title ?? "",
              stats: event.stats ?? {
                documentsGenerated: 0,
                timeSavedMinutes: 0,
                streakDays: 0,
              },
            });
          } else if (event.type === "error") {
            params.onError(event.message ?? "Generation failed. Please try again.");
          }
        } catch {
          // skip malformed event
        }
      }
    }
  } catch {
    if (params.signal?.aborted) {
      params.onError("Generation stopped.");
    } else {
      params.onError("Connection interrupted. Please try again.");
    }
  }
}

export interface AuthResult {
  user: UserProfile;
  token: string;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: UserProfile }>("/auth/me"),
  updateProfile: (patch: Record<string, unknown>) =>
    request<{ user: UserProfile }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listDocuments: (
    params: { page?: number; limit?: number; q?: string; favorites?: boolean } = {},
  ) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.q) sp.set("q", params.q);
    if (params.favorites) sp.set("favorites", "1");
    const qs = sp.toString();
    return request<DocumentsResponse>(`/documents${qs ? `?${qs}` : ""}`);
  },
  getDocument: (id: string) =>
    request<{ document: DocumentItem }>(`/documents/${id}`),
  favoriteDocument: (id: string, favorited: boolean) =>
    request<{ document: DocumentItem }>(`/documents/${id}/favorite`, {
      method: "PATCH",
      body: JSON.stringify({ favorited }),
    }),
  deleteDocument: (id: string) =>
    request<{ ok: boolean }>(`/documents/${id}`, { method: "DELETE" }),

  income: () =>
    request<IncomeResponse>("/income", { method: "POST", body: "{}" }),
};
