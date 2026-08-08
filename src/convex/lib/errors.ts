/**
 * Shared error helpers — pure module (no Node APIs), safe to import from
 * both the V8 http.ts router and "use node" actions.
 */

import { ConvexError } from "convex/values";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Throw an error that survives ctx.runAction boundaries with its
 * status + message intact (ConvexError.data is preserved).
 */
export function httpError(status: number, message: string): never {
  throw new ConvexError({ status, message });
}

export interface HttpErrorShape {
  status?: unknown;
  message?: unknown;
}
