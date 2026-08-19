import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";
import { getDb } from "../db.js";
import { ApiError } from "../middleware/error.js";

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

function toItem(doc: DocumentDoc, withContent: boolean) {
  const content = doc.content ?? "";
  return {
    _id: String(doc._id),
    title: doc.title ?? "Untitled",
    type: doc.type ?? "",
    content: withContent ? content : "",
    preview: content.slice(0, 300),
    parameters: doc.parameters ?? {},
    userId: String(doc.userId),
    favorited: Boolean(doc.favorited),
    createdAt: doc.createdAt ?? 0,
    updatedAt: doc.updatedAt ?? 0,
  };
}

const favoriteSchema = z.object({ favorited: z.boolean() });

export async function listDocuments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string ?? "9", 10) || 9),
    );
    const q = (req.query.q as string ?? "").trim();
    const favoritesOnly = req.query.favorites === "1" || req.query.favorites === "true";

    const filter: Record<string, unknown> = { userId: req.userId };
    if (favoritesOnly) filter.favorited = true;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: escaped, $options: "i" };
    }

    const db = await getDb();
    const collection = db.collection<DocumentDoc>("documents");
    const total = await collection.countDocuments(filter);
    const docs = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.status(200).json({
      items: docs.map((doc) => toItem(doc, false)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    if (!id) throw new ApiError(400, "Document ID is required.");

    const db = await getDb();
    const doc = await db
      .collection<DocumentDoc>("documents")
      .findOne({ _id: id, userId: req.userId });

    if (!doc) throw new ApiError(404, "Document not found.");
    res.status(200).json({ document: toItem(doc, true) });
  } catch (error) {
    next(error);
  }
}

export async function favoriteDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    if (!id) throw new ApiError(400, "Document ID is required.");

    const parsed = favoriteSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid request body.");

    const db = await getDb();
    const result = await db.collection<DocumentDoc>("documents").findOneAndUpdate(
      { _id: id, userId: req.userId },
      { $set: { favorited: parsed.data.favorited, updatedAt: Date.now() } },
      { returnDocument: "after" },
    );

    if (!result) throw new ApiError(404, "Document not found.");
    res.status(200).json({ document: toItem(result, true) });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    if (!id) throw new ApiError(400, "Document ID is required.");

    const db = await getDb();
    const result = await db
      .collection<DocumentDoc>("documents")
      .findOneAndDelete({ _id: id, userId: req.userId });

    if (!result) throw new ApiError(404, "Document not found.");
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}
