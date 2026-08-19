import type { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const status = err.status || 500;
  const message = err.message || "Unexpected server error. Please try again.";

  if (status === 500) {
    console.error("[Error Handler] Internal Server Error:", err);
  }

  res.status(status).json({ error: message });
}
