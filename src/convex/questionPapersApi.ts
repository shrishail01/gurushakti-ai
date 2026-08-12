"use node";

/**
 * B.Ed Past Question Papers — Node runtime action called from the V8 HTTP
 * router. Reads from the MongoDB `questionPapers` collection.
 *
 * Papers are added by administrators (or a future upload flow). This action
 * only ever lists documents that are already in the database, so nothing
 * fake or unverified is ever shown: the collection is expected to only
 * contain authentic papers with a `verified: true` flag.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getDb } from "./lib/mongo";
import type { QuestionPaper } from "../lib/types";

export const listQuestionPapers = internalAction({
  args: {
    q: v.string(),
    subject: v.string(),
    semester: v.string(),
    year: v.string(),
    university: v.string(),
  },
  handler: async (
    _ctx,
    { q, subject, semester, year, university },
  ): Promise<{
    items: QuestionPaper[];
    total: number;
    filters: {
      subjects: string[];
      semesters: string[];
      years: string[];
      universities: string[];
    };
  }> => {
    const db = await getDb();
    const collection = db.collection<QuestionPaper>("questionPapers");

    const filter: Record<string, unknown> = { verified: true };
    if (subject) filter.subject = subject;
    if (semester) filter.semester = semester;
    if (year) filter.year = year;
    if (university) filter.university = university;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: escaped, $options: "i" };
    }

    const total = await collection.countDocuments(filter);
    const docs = await collection
      .find(filter)
      .sort({ year: -1, semester: 1, createdAt: -1 })
      .limit(100)
      .toArray();

    // Facet options are derived from real data so filters always stay honest.
    const [subjects, semesters, years, universities] = await Promise.all([
      collection.distinct("subject"),
      collection.distinct("semester"),
      collection.distinct("year"),
      collection.distinct("university"),
    ]);

    const toItem = (doc: QuestionPaper): QuestionPaper => ({
      _id: String(doc._id),
      title: doc.title ?? "Untitled paper",
      subject: doc.subject ?? "",
      semester: doc.semester ?? "",
      year: doc.year ?? "",
      university: doc.university ?? "",
      description: doc.description ?? "",
      fileUrl: doc.fileUrl ?? "",
      verified: Boolean(doc.verified),
      createdAt: doc.createdAt ?? 0,
    });

    return {
      items: docs.map(toItem),
      total,
      filters: {
        subjects: [...new Set(subjects)].sort(),
        semesters: [...new Set(semesters)].sort(),
        years: [...new Set(years)].sort().reverse(),
        universities: [...new Set(universities)].sort(),
      },
    };
  },
});
