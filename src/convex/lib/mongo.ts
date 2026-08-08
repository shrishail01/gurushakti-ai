"use node";

/**
 * MongoDB Atlas connection shared by all "use node" actions.
 *
 * The connection string is read from process.env.MONGODB_URI (set via the
 * project Keys/API-keys UI — never exposed to the frontend).
 *
 * The client is cached at module scope so multiple action invocations reuse
 * the same connection pool inside the Convex Node runtime.
 */

import { MongoClient, type Db } from "mongodb";
import { ApiError } from "./errors";
import type { UserProfile } from "../../lib/types";

/** Typed shape of the MongoDB `users` collection documents. */
export interface UserDoc extends UserProfile {
  hashedPassword: string;
  lastActiveDate?: string;
}

/** Typed shape of the MongoDB `documents` collection documents. */
export interface DocumentDoc {
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

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "") {
    throw new ApiError(
      500,
      "MONGODB_URI is not configured. Add it in the project Keys/API-keys settings, then reload.",
    );
  }
  return uri.trim();
}

function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new MongoClient(getMongoUri(), {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      });
      await client.connect();
      const db = client.db();
      // Basic indexes: unique email + per-user document listing.
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db
        .collection("documents")
        .createIndex({ userId: 1, createdAt: -1 });
      return client;
    })();
    // Allow a fresh connection attempt on next call if this one failed.
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  return (await getClientPromise()).db();
}

/** String IDs keep JSON serialization simple (no ObjectId handling needed). */
export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
