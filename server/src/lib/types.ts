/**
 * Shared types used by both the frontend (React) and the Convex backend
 * (HTTP actions). Type-only imports are erased at build time, so these are
 * safe to share across the two bundles.
 */

export type Language = "en" | "kn";
export type OutputLanguage = "en" | "kn" | "both";

/** Mirrors the MongoDB `users` collection document. */
export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  preferredLanguage?: Language;
  district?: string;
  subjects?: string[];
  teachingLevel?: string;
  digitalSkillLevel?: string;
  devicesAvailable?: string[];
  freeHoursPerWeek?: number | string;
  teachingExperienceYears?: number | string;
  skills?: string[];
  incomeGoal?: string;
  careerGoal?: string;
  onboardingComplete: boolean;
  documentsGenerated: number;
  timeSavedMinutes: number;
  streakDays: number;
  createdAt: number;
  updatedAt: number;
  plan?: "free" | "plus";
  monthlyGenerationsUsed?: number;
  usageMonth?: string;
  subscriptionStatus?: "free" | "active" | "past_due" | "cancelled" | "expired";
  razorpaySubscriptionId?: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
}

/** Mirrors the MongoDB `documents` collection document (API shape). */
export interface DocumentItem {
  _id: string;
  title: string;
  type: string;
  content: string;
  preview: string;
  parameters: Record<string, string>;
  userId: string;
  favorited: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentsResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  pages: number;
}

/** Mirrors the MongoDB `questionPapers` collection document (API shape). */
export interface QuestionPaper {
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

export interface QuestionPapersResponse {
  items: QuestionPaper[];
  total: number;
  filters: {
    subjects: string[];
    semesters: string[];
    years: string[];
    universities: string[];
  };
}

export interface ApiErrorBody {
  error?: string;
}

/** Profile snapshot injected into AI prompts. */
export interface ProfileContext {
  name?: string;
  role?: string;
  teachingLevel?: string;
  subjects?: string[];
  district?: string;
  digitalSkillLevel?: string;
}

export interface IncomeOpportunity {
  opportunity: string;
  requiredSkills: string[];
  tools: string[];
  startupCost: string;
  pricing: string;
  month1: string;
  month3: string;
  month6: string;
  timeToFirstEarning: string;
  difficulty: "Low" | "Medium" | "High";
  risk: "Low" | "Medium" | "High";
  actionPlan7Day: string[];
  realityCheck: string;
}

export interface IncomeResponse {
  opportunities: IncomeOpportunity[];
  source: "ai" | "template";
  disclaimer: string;
}

export interface UserDoc extends UserProfile {
  hashedPassword: string;
  lastActiveDate?: string;
}

