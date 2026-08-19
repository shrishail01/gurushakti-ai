import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { getDb } from "../db.js";

interface QuestionPaper {
  _id: string;
  title: string;
  subject: string;
  semester: string;
  year: string;
  university: string;
  description?: string;
  fileUrl?: string;
  verified: boolean;
  createdAt: number;
}

export async function listQuestionPapers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string ?? "").trim().slice(0, 100);
    const subject = (req.query.subject as string ?? "").trim().slice(0, 100);
    const semester = (req.query.semester as string ?? "").trim().slice(0, 20);
    const year = (req.query.year as string ?? "").trim().slice(0, 10);
    const university = (req.query.university as string ?? "").trim().slice(0, 120);

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

    // Retrieve facets dynamically
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

    res.status(200).json({
      items: docs.map(toItem),
      total,
      filters: {
        subjects: [...new Set(subjects)].filter(Boolean).sort(),
        semesters: [...new Set(semesters)].filter(Boolean).sort(),
        years: [...new Set(years)].filter(Boolean).sort().reverse(),
        universities: [...new Set(universities)].filter(Boolean).sort(),
      },
    });
  } catch (error) {
    next(error);
  }
}
