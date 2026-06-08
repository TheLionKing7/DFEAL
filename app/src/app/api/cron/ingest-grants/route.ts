import { NextRequest, NextResponse } from "next/server";
import {
  unauthorizedCronResponse,
  verifyCronAuth,
} from "@/lib/cron/auth";
import {
  ingestAllEnabledGrants,
  ingestFederalGrantOpportunities,
} from "@/lib/ingest/grants-ingest";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import type { FederalGrantSource } from "@/lib/grants/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return unauthorizedCronResponse(request);
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const source = request.nextUrl.searchParams.get("source") as FederalGrantSource | null;

  try {
    const result = source
      ? await ingestFederalGrantOpportunities({ sources: [source], limit: 120 })
      : await ingestAllEnabledGrants(120);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grants ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
