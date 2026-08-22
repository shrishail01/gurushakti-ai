import type { Request, Response, NextFunction } from "express";
import { extractToken, verifyToken } from "../auth.js";
import { getDb } from "../db.js";
import type { UserDoc } from "../lib/types.js";

export interface AuthRequest extends Request {
  userId?: string;
  user?: UserDoc;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "You must be signed in to do that." });
    }

    const userId = verifyToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    const db = await getDb();
    const user = await db.collection<UserDoc>("users").findOne({ _id: userId });
    if (!user) {
      return res.status(401).json({ error: "This account no longer exists. Please sign in again." });
    }

    // Initialize or check subscription and usage limits
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    let needsUpdate = false;
    const updateFields: Partial<UserDoc> = {};

    // 1. Check if user plan needs default initialization
    if (!user.plan) {
      user.plan = "free";
      user.monthlyGenerationsUsed = 0;
      user.usageMonth = currentMonth;
      user.subscriptionStatus = "free";
      
      updateFields.plan = "free";
      updateFields.monthlyGenerationsUsed = 0;
      updateFields.usageMonth = currentMonth;
      updateFields.subscriptionStatus = "free";
      needsUpdate = true;
    }

    // 2. Check if a new calendar month has started (reset generations count)
    if (user.usageMonth !== currentMonth) {
      user.monthlyGenerationsUsed = 0;
      user.usageMonth = currentMonth;
      
      updateFields.monthlyGenerationsUsed = 0;
      updateFields.usageMonth = currentMonth;
      needsUpdate = true;
    }

    // 3. Check if subscription expired
    if (user.plan === "plus") {
      const active = user.subscriptionStatus === "active" || 
                     (user.currentPeriodEnd && user.currentPeriodEnd * 1000 > Date.now());
      if (!active) {
        user.plan = "free";
        user.subscriptionStatus = "expired";
        
        updateFields.plan = "free";
        updateFields.subscriptionStatus = "expired";
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updateFields.updatedAt = Date.now();
      await db.collection<UserDoc>("users").updateOne(
        { _id: userId },
        { $set: updateFields }
      );
    }

    req.userId = userId;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
