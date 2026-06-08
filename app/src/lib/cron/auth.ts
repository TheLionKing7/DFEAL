import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getCronSecret(): string | undefined {
  const raw = process.env.CRON_SECRET;
  if (!raw?.trim()) return undefined;
  return stripWrappingQuotes(raw);
}

export function getCronSecretConfigured(): boolean {
  return Boolean(getCronSecret());
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = stripWrappingQuotes(provided);
  const b = stripWrappingQuotes(expected);
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const trimmed = authorization.trim();
  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1].trim();
  return trimmed;
}

function readQuerySecret(request: NextRequest): string | null {
  for (const key of ["cron_secret", "secret", "token"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function verifyCronAuth(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;

  const candidates = [
    readBearerToken(request.headers.get("authorization")),
    request.headers.get("x-cron-secret"),
    request.headers.get("cron-secret"),
    request.headers.get("x-vercel-cron-secret"),
    readQuerySecret(request),
  ];

  return candidates.some(
    (candidate) => candidate && secretsMatch(candidate, secret),
  );
}

export function unauthorizedCronResponse(request?: NextRequest) {
  const configured = getCronSecretConfigured();
  const receivedAuth = request?.headers.get("authorization");
  const receivedHeader = request?.headers.get("x-cron-secret");
  const receivedQuery = request ? readQuerySecret(request) : null;

  return NextResponse.json(
    {
      error: "Unauthorized",
      cron_configured_on_server: configured,
      received: {
        authorization_header: receivedAuth ? "present" : "missing",
        x_cron_secret_header: receivedHeader ? "present" : "missing",
        query_secret: receivedQuery ? "present" : "missing",
      },
      hint: configured
        ? "Use Custom Headers (not HTTP Basic Auth). Header: Authorization | Value: Bearer YOUR_SECRET — no quotes. Or set URL ?cron_secret=YOUR_SECRET. Redeploy Vercel after env changes."
        : "CRON_SECRET is not set on this Vercel deployment. Add it under Production env vars and redeploy.",
    },
    { status: 401 },
  );
}
