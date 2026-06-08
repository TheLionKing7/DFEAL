import { NextRequest, NextResponse } from "next/server";
import {
  unauthorizedCronResponse,
  verifyCronAuth,
} from "@/lib/cron/auth";
import { ingestAllEnabledSled, ingestSledOpportunities } from "@/lib/ingest/sled-ingest";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import type { SledSource } from "@/lib/sled/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return unauthorizedCronResponse(request);
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const source = request.nextUrl.searchParams.get("source") as SledSource | null;

  try {
    const result = source
      ? await ingestSledOpportunities({ sources: [source], daysBack: 30 })
      : await ingestAllEnabledSled(30);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SLED ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
