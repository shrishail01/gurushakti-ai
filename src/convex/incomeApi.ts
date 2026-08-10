"use node";

/**
 * Income Engine — Node runtime action. Uses the user's REAL profile
 * (subjects, teaching level, district, digital skill level, devices, free
 * hours, income goal) to generate 5 personalised income opportunities.
 * Prefers Gemini; falls back to a deterministic profile-driven generator
 * when the AI key is missing or the AI output is unparseable. All figures
 * are explicitly labelled estimates — we never guarantee earnings.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getDb, type UserDoc } from "./lib/mongo";
import { httpError } from "./lib/errors";
import type { IncomeOpportunity, IncomeResponse } from "../lib/types";

const DISCLAIMER =
  "These income figures are rough estimates based on your profile and common market rates in Karnataka. They are NOT guarantees — actual earnings depend on effort, demand and consistency.";

function getGeminiKey(): string | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim() !== "" ? key.trim() : null;
}

async function incomeFromGemini(user: UserDoc): Promise<IncomeOpportunity[]> {
  const key = getGeminiKey();
  if (!key) throw new Error("no key");

  const profile: Record<string, unknown> = {
    role: user.role ?? "Teacher",
    subjects: user.subjects ?? [],
    teachingLevel: user.teachingLevel ?? "school",
    district: user.district ?? "",
    digitalSkillLevel: user.digitalSkillLevel ?? "",
    devicesAvailable: user.devicesAvailable ?? [],
    freeHoursPerWeek: user.freeHoursPerWeek ?? 0,
    teachingExperienceYears: user.teachingExperienceYears ?? 0,
    skills: user.skills ?? [],
    incomeGoal: user.incomeGoal ?? "",
  };

  const prompt = [
    "You are a practical, honest career advisor for school teachers in Karnataka, India.",
    "Based ONLY on this teacher's profile, suggest 5 realistic ways they can earn extra income from their existing teaching skills.",
    "",
    "PROFILE (JSON):",
    JSON.stringify(profile, null, 2),
    "",
    "RULES:",
    "- Each idea must be genuinely feasible for a Karnataka school teacher (offline or online).",
    "- Startup cost must be low (₹0 – ₹10,000).",
    "- Pricing and monthly potential must be realistic estimates in INR (₹) — always ranges, never promises.",
    "- Never guarantee earnings.",
    "",
    "Respond with ONLY a JSON array of exactly 5 objects. Do not include markdown fences, comments or extra text.",
    "Each object must have exactly these keys:",
    'opportunity (string), requiredSkills (array of strings), tools (array of strings), startupCost (string like "₹500 – ₹2,000"), pricing (string like "₹1,500/month per student"), month1 (string like "₹0 – ₹5,000"), month3 (string like "₹8,000 – ₹20,000"), month6 (string like "₹20,000 – ₹50,000"), timeToFirstEarning (string like "2–4 weeks"), difficulty ("Low" | "Medium" | "High"), risk ("Low" | "Medium" | "High"), actionPlan7Day (array of exactly 7 strings, day-by-day actions), realityCheck (string, one honest caveat sentence).',
  ].join("\n");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 16000 },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const decoder = new TextDecoder();
  let text = "";
  let buffer = "";
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
        text += chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } catch {
        // skip
      }
    }
  }

  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("no json array");
  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("not an array");

  return parsed
    .slice(0, 5)
    .map((item): IncomeOpportunity | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const str = (value: unknown, fallback: string) =>
        typeof value === "string" && value.trim() ? value.trim() : fallback;
      const arr = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((x): x is string => typeof x === "string").slice(0, 8)
          : [];
      const level = (value: unknown): "Low" | "Medium" | "High" =>
        value === "Low" || value === "High" ? value : "Medium";
      return {
        opportunity: str(o.opportunity, "Untitled opportunity"),
        requiredSkills: arr(o.requiredSkills),
        tools: arr(o.tools),
        startupCost: str(o.startupCost, "₹0 – ₹1,000 (estimate)"),
        pricing: str(o.pricing, "Market-rate (estimate)"),
        month1: str(o.month1, "₹0 – ₹2,000 (estimate)"),
        month3: str(o.month3, "₹5,000 – ₹15,000 (estimate)"),
        month6: str(o.month6, "₹15,000 – ₹40,000 (estimate)"),
        timeToFirstEarning: str(o.timeToFirstEarning, "3–6 weeks"),
        difficulty: level(o.difficulty),
        risk: level(o.risk),
        actionPlan7Day: arr(o.actionPlan7Day).slice(0, 7),
        realityCheck: str(o.realityCheck, "Results vary with effort and demand."),
      };
    })
    .filter((o): o is IncomeOpportunity => o !== null);
}

function fallbackIncome(user: UserDoc): IncomeOpportunity[] {
  const subjects = user.subjects?.length
    ? user.subjects.join(", ")
    : "your subjects";
  const level = user.teachingLevel ?? "school students";
  const district = user.district || "your district";
  const skills = user.skills?.length
    ? user.skills
    : ["Teaching", "Communication"];

  const base = (
    opportunity: string,
    extra: Partial<IncomeOpportunity>,
  ): IncomeOpportunity => ({
    opportunity,
    requiredSkills: [...skills.slice(0, 3)],
    tools: ["Smartphone", "WhatsApp"],
    startupCost: "₹0 – ₹1,000 (estimate)",
    pricing: "Market-rate (estimate)",
    month1: "₹0 – ₹3,000 (estimate)",
    month3: "₹5,000 – ₹15,000 (estimate)",
    month6: "₹15,000 – ₹35,000 (estimate)",
    timeToFirstEarning: "3–6 weeks",
    difficulty: "Medium",
    risk: "Low",
    actionPlan7Day: [
      "Day 1: Write a short intro message about your service and post it on WhatsApp status.",
      "Day 2: Ask 5 former students' parents if they know someone who needs help.",
      "Day 3: Prepare one free sample (worksheet or demo lesson) to share.",
      "Day 4: Message 10 potential parents/students with a polite offer.",
      "Day 5: Fix your price and a simple schedule that fits your free hours.",
      "Day 6: Take the first student/payment and ask for one testimonial.",
      "Day 7: Review what worked and plan next week's 5 new contacts.",
    ],
    realityCheck:
      "First earnings take 2–6 weeks of consistent outreach; not everyone you contact will reply.",
    ...extra,
  });

  return [
    base(`Personal tuition for ${subjects} (${level})`, {
      pricing: "₹500 – ₹2,000/month per student (estimate)",
      timeToFirstEarning: "2–4 weeks",
      difficulty: "Medium",
      actionPlan7Day: [
        `Day 1: List the ${subjects} topics you can teach confidently for ${level}.`,
        "Day 2: Set your fee (₹500–₹2,000/month) and weekly schedule within your free hours.",
        "Day 3: Tell 10 neighbours and 10 WhatsApp contacts you are taking 3 new students.",
        "Day 4: Share a 2-minute sample teaching video on WhatsApp/Instagram.",
        "Day 5: Follow up with anyone who showed interest and fix a free demo class.",
        "Day 6: Conduct the demo, collect feedback, and close 1–2 students.",
        "Day 7: Ask your first student's parents for a one-line testimonial to share.",
      ],
    }),
    base("Worksheet & question-paper packs you design and sell", {
      tools: ["Smartphone", "Laptop or tablet", "Canva free", "WhatsApp"],
      startupCost: "₹0 – ₹500 (estimate)",
      pricing: "₹50 – ₹200 per pack (estimate)",
      difficulty: "Low",
      actionPlan7Day: [
        `Day 1: Pick 3 popular topics in ${subjects} for ${level} that teachers search for.`,
        "Day 2: Design one 10-question worksheet with an answer key (handwritten → phone photo is fine to start).",
        "Day 3: Create a simple cover page and price the pack (₹50–₹200).",
        "Day 4: Post the sample on teacher WhatsApp groups and Instagram.",
        "Day 5: Offer the first 5 buyers a discount in exchange for reviews.",
        "Day 6: Collect payment (GPay/UPI) and deliver PDFs instantly.",
        "Day 7: List what sold and plan the next 2 packs.",
      ],
    }),
    base(`Exam & assessment design service for schools in ${district}`, {
      tools: ["Smartphone", "Laptop", "MS Word/Google Docs"],
      startupCost: "₹0 – ₹2,000 (estimate)",
      pricing: "₹500 – ₹2,000 per paper (estimate)",
      difficulty: "Medium",
      timeToFirstEarning: "4–8 weeks",
      actionPlan7Day: [
        `Day 1: Prepare one sample question paper (with blueprint table) in ${subjects}.`,
        "Day 2: List 10 nearby schools/coaching centres in your district.",
        "Day 3: Draft a polite one-page service offer letter.",
        "Day 4: Visit or call 3 schools and leave the sample with the headmaster.",
        "Day 5: Follow up with the schools you contacted.",
        "Day 6: Offer a free first paper to your best prospect for a testimonial.",
        "Day 7: Set a portfolio folder (Google Drive) with your samples.",
      ],
    }),
    base("Kannada–English translation & document help for teachers", {
      tools: ["Smartphone", "Google Docs"],
      startupCost: "₹0 – ₹500 (estimate)",
      pricing: "₹100 – ₹500 per document (estimate)",
      difficulty: "Low",
      risk: "Low",
      actionPlan7Day: [
        "Day 1: List the document types you can help with (circulars, notices, letters, applications).",
        "Day 2: Translate one sample circular and one sample letter as portfolio pieces.",
        "Day 3: Post a simple offer on 5 teacher WhatsApp groups.",
        "Day 4: Message 10 teacher friends explaining the service.",
        "Day 5: Deliver 2–3 quick jobs and ask for referrals.",
        "Day 6: Fix turnaround times (24–48 hrs) and simple pricing.",
        "Day 7: Collect 3 reviews to share in your next post.",
      ],
    }),
    base("Digital lesson content (PPT + short video lessons) for schools & YouTube", {
      tools: ["Smartphone", "Laptop/tablet", "Canva free", "YouTube"],
      startupCost: "₹0 – ₹3,000 (estimate)",
      pricing: "₹1,000 – ₹5,000 per school package (estimate)",
      difficulty: "High",
      risk: "Medium",
      timeToFirstEarning: "6–12 weeks",
      actionPlan7Day: [
        `Day 1: Pick your best topic in ${subjects} and script a 5-minute lesson.`,
        "Day 2: Build a simple 8-slide PPT on your phone/Canva.",
        "Day 3: Record the video lesson (good lighting, clear voice) — reshoot if needed.",
        "Day 4: Upload to YouTube (public or unlisted) and to WhatsApp status.",
        "Day 5: Share with 5 schools offering a free sample lesson.",
        "Day 6: Collect feedback and improve the next video.",
        "Day 7: Decide: school packages, YouTube channel, or both — and post weekly.",
      ],
    }),
  ];
}

export const generateIncome = internalAction({
  args: { userId: v.string() },
  handler: async (_ctx, { userId }) => {
    const db = await getDb();
    const user = await db.collection<UserDoc>("users").findOne({ _id: userId });
    if (!user) httpError(401, "This account no longer exists.");

    let opportunities: IncomeOpportunity[];
    let source: IncomeResponse["source"] = "template";

    try {
      opportunities = await incomeFromGemini(user);
      source = "ai";
    } catch {
      opportunities = fallbackIncome(user);
      source = "template";
    }

    return { opportunities, source, disclaimer: DISCLAIMER };
  },
});
