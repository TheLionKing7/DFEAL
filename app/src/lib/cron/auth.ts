import { NextRequest, NextResponse } from "next/server";

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const trimmed = authorization.trim();
  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1].trim();
  return trimmed;
}

export function getCronSecretConfigured(): boolean {
  return Boolean(process.env.CRON_SECRET?.trim());
}

export function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const bearer = readBearerToken(request.headers.get("authorization"));
  if (bearer === secret) return true;

  const xCron = request.headers.get("x-cron-secret")?.trim();
  if (xCron === secret) return true;

  const cronSecret = request.headers.get("cron-secret")?.trim();
  if (cronSecret === secret) return true;

  return false;
}

export function unauthorizedCronResponse() {
  const configured = getCronSecretConfigured();
  return NextResponse.json(
    {
      error: "Unauthorized",
      hint: configured
        ? "Check Authorization: Bearer <CRON_SECRET> matches Vercel CRON_SECRET exactly (no extra quotes or spaces)."
        : "CRON_SECRET is not set on the server. Add it in Vercel → Settings → Environment Variables, then redeploy.",
    },
    { status: 401 },
  );
}
