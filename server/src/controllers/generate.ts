import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import { getDb, newId, now } from "../db.js";
import { runRateLimit } from "../middleware/rateLimit.js";
import { getTool, buildToolPrompt, buildDocumentTitle } from "../lib/tools.js";
import { ApiError } from "../middleware/error.js";
import type { UserDoc } from "../lib/types.js";
import { resolveImagePlaceholders } from "../lib/imageSearch.js";

interface DocumentDoc {
  _id: string;
  title: string;
  type: string;
  content: string;
  parameters: Record<string, string>;
  userId: string;
  favorited: boolean;
  createdAt: number;
  updatedAt: number;
}

const generateSchema = z.object({
  toolId: z.string().min(1).max(64),
  parameters: z.record(z.string(), z.string()).default({}),
  outputLanguage: z.enum(["en", "kn", "both"]).default("en"),
});

function profileFromUser(user: any) {
  return {
    name: user.name,
    role: user.role,
    teachingLevel: user.teachingLevel,
    subjects: user.subjects,
    district: user.district,
    digitalSkillLevel: user.digitalSkillLevel,
  };
}

export async function generate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const limited = runRateLimit(`generate:${req.userId}`, 30, 60_000);
    if (!limited.ok) {
      throw new ApiError(
        429,
        "You've generated a lot recently. Please wait a moment and try again.",
      );
    }

    const parsed = generateSchema.safeParse(req.body);
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

    const rawPrompt = buildToolPrompt(
      tool,
      parameters,
      profileFromUser(req.user),
      outputLanguage,
    );
    const title = buildDocumentTitle(tool, parameters);

    const prompt = [
      rawPrompt,
      "",
      "---",
      "CRITICAL VISUAL REQUIREMENT (MANDATORY):",
      "You MUST automatically place relevant educational image placeholders in your content where a visual would be genuinely useful for student understanding (e.g. diagrams, illustrations, charts, timelines, scientific figures, maps, mathematical shapes).",
      "For each section where a visual is useful, insert an image placeholder on its own line using this exact syntax:",
      "![IMAGE_SEARCH: precise descriptive english search query](placeholder)",
      "",
      "Guidelines:",
      "- In lesson plans/presentations: place them near complex concepts, steps, or activities.",
      "- In worksheets/quizzes: place them only where a question requires visual analysis or identification.",
      "- For PPT slides: place distinct, specific visual placeholders across different slides (do not repeat the same query on every slide).",
      "- Keep queries descriptive and in English (e.g., 'photosynthesis process diagram for class 5', 'labelled plant cell illustration').",
      "- Do not insert decorative or generic photos. If a section does not need an image, leave it text-only."
    ].join("\n");

    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "") {
      throw new ApiError(
        500,
        "GEMINI_API_KEY is not configured yet. Add it in the backend environment variables, then try again.",
      );
    }

    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key.trim())}`;

    // Set up SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240_000);

    req.on("close", () => {
      clearTimeout(timeoutId);
      controller.abort();
    });

    const systemInstructionText = [
      "You are GuruShakti AI, an expert AI assistant for school teachers in Karnataka, India.",
      "You create practical, high-quality teaching materials in clean Markdown.",
      "You write in simple, respectful, professional English and/or Kannada as requested.",
      "Never fabricate facts; use placeholders like [Name] and [Date] when details are unknown.",
      "Keep outputs immediately usable in a real classroom.",
      "",
      "You MUST automatically place relevant educational image placeholders in your content where a visual would be genuinely useful for student understanding (e.g. diagrams, illustrations, charts, timelines, scientific figures, maps, mathematical shapes).",
      "For each section where a visual is useful, insert an image placeholder on its own line using this exact syntax:",
      "![IMAGE_SEARCH: precise descriptive english search query](placeholder)",
      "",
      "Instructions for specific document types:",
      "- Lesson Plan: Place visuals to explain complex concepts, steps, or classroom activities.",
      "- Worksheet / Question Paper / Quiz: Place visuals only where a question requires visual identification or analysis (e.g. \"Identify the parts of the leaf shown below:\", \"Solve for the area of the following shape:\"). Do not add generic decorative photos.",
      "- Slide PPT Presentation: Place relevant visual placeholders across slides. Ensure each slide independently determines if a visual is useful and uses a distinct, specific query (do not repeat the same query on every slide).",
      "- General: Place queries close to the corresponding text. Use clear, descriptive English queries (e.g. \"photosynthesis process diagram for class 5\", \"water cycle step by step drawing\") so the image search engine can resolve them properly. Do not place visuals in sections like introduction, objectives or assessments unless they are directly helpful. If no image is needed for a section, leave it text-only."
    ].join("\n");

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstructionText }],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 65536 },
      }),
      signal: controller.signal,
    });

    if (!geminiRes.ok) {
      const text = await geminiRes.text().catch(() => "");
      throw new ApiError(502, `Gemini API error (${geminiRes.status}). ${text.slice(0, 200)}`);
    }

    const reader = geminiRes.body?.getReader();
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
            res.write(`data: ${JSON.stringify({ type: "delta", text: delta })}\n\n`);
          }
        } catch {
          // skip
        }
      }
    }

    clearTimeout(timeoutId);

    if (!content.trim()) {
      throw new ApiError(502, "Gemini returned an empty response. Please try again.");
    }

    // Resolve image search placeholders to direct URLs
    const resolvedContent = await resolveImagePlaceholders(content);

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const user = await users.findOne({ _id: req.userId });
    if (!user) throw new ApiError(401, "This account no longer exists.");

    const documentId = newId();
    const createdAt = now();
    const doc: DocumentDoc = {
      _id: documentId,
      title,
      type: toolId,
      content: resolvedContent,
      parameters,
      userId: req.userId!,
      favorited: false,
      createdAt,
      updatedAt: createdAt,
    };
    await db.collection<DocumentDoc>("documents").insertOne(doc);

    // Day streak
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    let streak = user.streakDays ?? 0;
    if (user.lastActiveDate !== today) {
      streak = user.lastActiveDate === yesterday ? streak + 1 : 1;
    }
    await users.updateOne(
      { _id: req.userId },
      {
        $set: { streakDays: streak, lastActiveDate: today, updatedAt: now() },
        $inc: { documentsGenerated: 1, timeSavedMinutes: 15 },
      },
    );

    const stats = {
      documentsGenerated: (user.documentsGenerated ?? 0) + 1,
      timeSavedMinutes: (user.timeSavedMinutes ?? 0) + 15,
      streakDays: streak,
    };

    res.write(
      `data: ${JSON.stringify({
        type: "done",
        documentId,
        title,
        stats,
      })}\n\n`,
    );
    res.end();
  } catch (error: any) {
    const message = error.message || "Generation failed. Please try again.";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
}
