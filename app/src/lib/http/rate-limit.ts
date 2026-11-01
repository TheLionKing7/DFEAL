import { NextResponse } from "next/server";

/**
 * Best-effort fixed-window rate limiter, kept in memory per server instance.
 * On serverless this bounds bursts per warm instance — enough to stop a
 * runaway client from burning LLM credits. For strict global limits put
 * Upstash/Redis or Vercel WAF rate limiting in front of /api/*.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return null;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}
