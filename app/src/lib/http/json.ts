import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/** Parse a JSON body; returns null (→ 400) instead of throwing on malformed input. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ error, ...(details ? { details } : {}) }, { status: 400 });
}

export function notFound(error = "Not found") {
  return NextResponse.json({ error }, { status: 404 });
}

/**
 * Log the real error server-side and return a generic 500. Upstream/provider
 * messages can contain request details, so they are not echoed to clients in
 * production.
 */
export function serverError(event: string, error: unknown, publicMessage = "Request failed") {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(event, { error: message });
  return NextResponse.json(
    { error: process.env.NODE_ENV === "production" ? publicMessage : message },
    { status: 500 },
  );
}
