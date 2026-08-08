"use node";

/**
 * Document CRUD — Node runtime actions called from the V8 HTTP router.
 * Ownership is enforced in every query with { _id, userId }, so users can
 * only ever access their own documents.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getDb, type DocumentDoc } from "./lib/mongo";
import { httpError } from "./lib/errors";

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

export const listDocuments = internalAction({
  args: {
    userId: v.string(),
    page: v.number(),
    limit: v.number(),
    q: v.string(),
    favoritesOnly: v.boolean(),
  },
  handler: async (_ctx, { userId, page, limit, q, favoritesOnly }) => {
    const filter: Record<string, unknown> = { userId };
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

    return {
      items: docs.map((doc) => toItem(doc, false)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  },
});

export const getDocument = internalAction({
  args: { userId: v.string(), id: v.string() },
  handler: async (_ctx, { userId, id }) => {
    const db = await getDb();
    const doc = await db
      .collection<DocumentDoc>("documents")
      .findOne({ _id: id, userId });
    if (!doc) httpError(404, "Document not found.");
    return { document: toItem(doc!, true) };
  },
});

export const favoriteDocument = internalAction({
  args: {
    userId: v.string(),
    id: v.string(),
    favorited: v.boolean(),
  },
  handler: async (_ctx, { userId, id, favorited }) => {
    const db = await getDb();
    const result = await db.collection<DocumentDoc>("documents").findOneAndUpdate(
      { _id: id, userId },
      { $set: { favorited, updatedAt: Date.now() } },
      { returnDocument: "after" },
    );
    if (!result) httpError(404, "Document not found.");
    return { document: toItem(result!, true) };
  },
});

export const deleteDocument = internalAction({
  args: { userId: v.string(), id: v.string() },
  handler: async (_ctx, { userId, id }) => {
    const db = await getDb();
    const result = await db
      .collection<DocumentDoc>("documents")
      .findOneAndDelete({ _id: id, userId });
    if (!result) httpError(404, "Document not found.");
    return { ok: true };
  },
});
