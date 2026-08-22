import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/error.js";
import { requireAuth } from "./middleware/auth.js";
import { register, login, logout, me, updateProfile } from "./controllers/auth.js";
import { listDocuments, getDocument, favoriteDocument, deleteDocument } from "./controllers/documents.js";
import { generate } from "./controllers/generate.js";
import { generateIncome } from "./controllers/income.js";
import { getSubscription, createSubscription, handleWebhook } from "./controllers/subscription.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS setup
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean) as string[]
);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    // Allow matching allowedOrigins or localhost ports
    if (
      allowedOrigins.has(origin) ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return callback(null, true);
    }
    // Allow vercel preview deployments and development environments dynamically
    if (
      process.env.NODE_ENV !== "production" ||
      /\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// API Routes
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/me", requireAuth, me);
app.patch("/api/auth/me", requireAuth, updateProfile);

app.post("/api/generate", requireAuth, generate);
app.post("/api/income", requireAuth, generateIncome);

app.get("/api/subscription", requireAuth, getSubscription);
app.post("/api/subscription/create", requireAuth, createSubscription);
app.post("/api/webhooks/razorpay", handleWebhook);

app.get("/api/documents", requireAuth, listDocuments);
app.get("/api/documents/:id", requireAuth, getDocument);
app.patch("/api/documents/:id/favorite", requireAuth, favoriteDocument);
app.delete("/api/documents/:id", requireAuth, deleteDocument);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: Date.now() });
});

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[Server] Express backend listening on port ${PORT}`);
});
