import { MongoClient, type Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let clientPromise: Promise<MongoClient> | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === "") {
    throw new Error("MONGODB_URI is not configured in environment variables.");
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
      
      // Initialize basic indexes
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db
        .collection("documents")
        .createIndex({ userId: 1, createdAt: -1 });
        
      return client;
    })();
    
    // Allow fresh connection attempts on next call if this one fails
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  return (await getClientPromise()).db();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
