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

    req.userId = userId;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
