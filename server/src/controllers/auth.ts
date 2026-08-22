import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb, newId, now } from "../db.js";
import { signToken, publicUser, TOKEN_COOKIE, TOKEN_MAX_AGE_MS } from "../auth.js";
import { ApiError } from "../middleware/error.js";
import { runRateLimit } from "../middleware/rateLimit.js";
import type { UserDoc } from "../lib/types.js";

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
    freeHoursPerWeek: z.union([z.number().min(0).max(168), z.string().max(60)]).optional(),
    teachingExperienceYears: z.union([z.number().min(0).max(60), z.string().max(60)]).optional(),
    skills: z.array(z.string().max(60)).max(30).optional(),
    incomeGoal: z.string().max(200).optional(),
    careerGoal: z.string().max(400).optional(),
    onboardingComplete: z.boolean().optional(),
  })
  .strict();

export async function register(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const clientIp = req.ip || "unknown";
    const limited = runRateLimit(`register:${clientIp}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      throw new ApiError(429, "Too many sign-up attempts. Please try again later.");
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    const { name: n, email: e, password: p } = parsed.data;

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const existing = await users.findOne({ email: e });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists. Please sign in.");
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
      plan: "free",
      monthlyGenerationsUsed: 0,
      usageMonth: new Date().toISOString().slice(0, 7),
      subscriptionStatus: "free",
      createdAt,
      updatedAt: createdAt,
    };

    await users.insertOne(userDoc);
    const token = signToken(userDoc._id);

    res.cookie(TOKEN_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: TOKEN_MAX_AGE_MS,
    });

    res.status(200).json({ user: publicUser(userDoc), token });
  } catch (error) {
    next(error);
  }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const clientIp = req.ip || "unknown";
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    
    const limited = runRateLimit(`login:${clientIp}:${rawEmail}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      throw new ApiError(429, "Too many sign-in attempts. Please try again later.");
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }
    const { email: e, password: p } = parsed.data;

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const user = await users.findOne({ email: e });

    if (!user) throw new ApiError(401, "Invalid email or password.");
    const match = await bcrypt.compare(p, user.hashedPassword);
    if (!match) throw new ApiError(401, "Invalid email or password.");

    const token = signToken(user._id);

    res.cookie(TOKEN_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: TOKEN_MAX_AGE_MS,
    });

    res.status(200).json({ user: publicUser(user), token });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.clearCookie(TOKEN_COOKIE, {
      path: "/",
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = profilePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input.");
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const update: Record<string, unknown> = { ...parsed.data, updatedAt: now() };
    await users.updateOne({ _id: req.userId }, { $set: update });

    const updated = await users.findOne({ _id: req.userId });
    if (!updated) throw new ApiError(404, "User not found.");

    res.status(200).json({ user: publicUser(updated) });
  } catch (error) {
    next(error);
  }
}
