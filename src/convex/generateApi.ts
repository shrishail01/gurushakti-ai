"use node";

/**
 * Saves a successfully generated document to MongoDB and updates the user's
 * statistics (documentsGenerated +1, timeSavedMinutes +15, day streak).
 * Called from the V8 HTTP router's streaming generate handler once the
 * Gemini stream completes.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getDb, newId, now, type DocumentDoc, type UserDoc } from "./lib/mongo";
import { httpError } from "./lib/errors";

export const saveGeneratedDocument = internalAction({
  args: {
    userId: v.string(),
    toolId: v.string(),
    title: v.string(),
    content: v.string(),
    parameters: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { userId, toolId, title, content, parameters }) => {
    if (!content.trim()) {
      httpError(502, "Gemini returned an empty response. Please try again.");
    }

    const db = await getDb();
    const users = db.collection<UserDoc>("users");
    const user = await users.findOne({ _id: userId });
    if (!user) httpError(401, "This account no longer exists.");

    const documentId = newId();
    const createdAt = now();
    const doc: DocumentDoc = {
      _id: documentId,
      title,
      type: toolId,
      content,
      parameters,
      userId,
      favorited: false,
      createdAt,
      updatedAt: createdAt,
    };
    await db.collection<DocumentDoc>("documents").insertOne(doc);

    // Day streak: consecutive active days counted from lastActiveDate.
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    let streak = user.streakDays ?? 0;
    if (user.lastActiveDate !== today) {
      streak = user.lastActiveDate === yesterday ? streak + 1 : 1;
    }
    await users.updateOne(
      { _id: userId },
      {
        $set: { streakDays: streak, lastActiveDate: today, updatedAt: now() },
        $inc: { documentsGenerated: 1, timeSavedMinutes: 15 },
      },
    );

    return {
      documentId,
      title,
      stats: {
        documentsGenerated: (user.documentsGenerated ?? 0) + 1,
        timeSavedMinutes: (user.timeSavedMinutes ?? 0) + 15,
        streakDays: streak,
      },
    };
  },
});
