import { NextRequest, NextResponse } from "next/server";
import { ingestSamOpportunities } from "@/lib/ingest/sam-ingest";
import {
  unauthorizedCronResponse,
  verifyCronAuth,
} from "@/lib/cron/auth";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return unauthorizedCronResponse(request);
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  try {
    const daysBack = Number(request.nextUrl.searchParams.get("days") ?? 7);
    const result = await ingestSamOpportunities(daysBack);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SAM ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
