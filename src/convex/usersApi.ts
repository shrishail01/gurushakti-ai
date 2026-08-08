"use node";

/**
 * User & auth logic — Node runtime actions called from the V8 HTTP router
 * via ctx.runAction. Passwords are hashed with bcryptjs; sessions are JWTs
 * (delivered to the browser as HttpOnly cookies by the router).
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb, newId, now, type UserDoc } from "./lib/mongo";
import { signToken, verifyToken } from "./lib/jwt";
import { publicUser } from "./lib/session";
import { httpError } from "./lib/errors";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(100),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password.").max(100),
});

const profilePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.string().max(80).optional(),
    preferredLanguage: z.enum(["en", "kn"]).optional(),
    district: z.string().max(120).optional(),
    subjects: z.array(z.string().max(80)).max(20).optional(),
    teachingLevel: z.string().max(80).optional(),
    digitalSkillLevel: z.string().max(40).optional(),
    devicesAvailable: z.array(z.string().max(40)).max(10).optional(),
    freeHoursPerWeek: z.number().min(0).max(168).optional(),
    teachingExperienceYears: z.number().min(0).max(60).optional(),
    skills: z.array(z.string().max(60)).max(30).optional(),
    incomeGoal: z.string().max(200).optional(),
    careerGoal: z.string().max(400).optional(),
    onboardingComplete: z.boolean().optional(),
  })
  .strict();

export const authenticateUser = internalAction({
  args: { token: v.union(v.string(), v.null()) },
  handler: async (_ctx, { token }) => {
    if (!token) httpError(401, "You must be signed in to do that.");
    const userId = verifyToken(token!);
    if (!userId) {
      httpError(401, "Your session has expired. Please sign in again.");
    }
    const db = await getDb();
    const user = await db.collection<UserDoc>("users").findOne({ _id: userId! });
    if (!user) {
      httpError(401, "This account no longer exists. Please sign in again.");
    }
    return { userId: userId!, user: publicUser(user!) };
  },
});

export const registerUser = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (_ctx, { name, email, password }) => {
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      httpError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    const { name: n, email: e, password: p } = parsed.data;

    const db = await getDb();
    const existing = await db.collection<UserDoc>("users").findOne({ email: e });
    if (existing) {
      httpError(409, "An account with this email already exists. Please sign in.");
    }

    const nameParts = n.split(/\s+/);
    const firstName = nameParts[0] ?? n;
    const lastName = nameParts.slice(1).join(" ");

    const hashedPassword = await bcrypt.hash(p, 10);
    const createdAt = now();
    const userDoc: UserDoc = {
      _id: newId(),
      name: n,
      firstName,
      lastName: lastName || undefined,
      email: e,
      hashedPassword,
      role: "user",
      preferredLanguage: "en",
      onboardingComplete: false,
      documentsGenerated: 0,
      timeSavedMinutes: 0,
      streakDays: 0,
      createdAt,
      updatedAt: createdAt,
    };

    await db.collection<UserDoc>("users").insertOne(userDoc);
    const token = signToken(userDoc._id);
    return { user: publicUser(userDoc), token };
  },
});

export const loginUser = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (_ctx, { email, password }) => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      httpError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    const { email: e, password: p } = parsed.data;

    const db = await getDb();
    const user = await db.collection<UserDoc>("users").findOne({ email: e });

    if (!user) httpError(401, "Invalid email or password.");
    const match = await bcrypt.compare(p, user!.hashedPassword);
    if (!match) httpError(401, "Invalid email or password.");

    const token = signToken(user!._id);
    return { user: publicUser(user!), token };
  },
});

export const updateUserProfile = internalAction({
  args: { userId: v.string(), patch: v.any() },
  handler: async (_ctx, { userId, patch }) => {
    const parsed = profilePatchSchema.safeParse(patch);
    if (!parsed.success) {
      httpError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const db = await getDb();
    const update: Record<string, unknown> = { ...parsed.data, updatedAt: now() };
    await db
      .collection<UserDoc>("users")
      .updateOne({ _id: userId }, { $set: update });

    const updated = await db.collection<UserDoc>("users").findOne({ _id: userId });
    if (!updated) httpError(404, "User not found.");
    return { user: publicUser(updated!) };
  },
});
