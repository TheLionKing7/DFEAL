import { NextRequest, NextResponse } from "next/server";
import { runDueAutomations } from "@/lib/automations/engine";
import { unauthorizedCronResponse, verifyCronAuth } from "@/lib/cron/auth";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 300;

/** Run every enabled automation that is due. Schedule hourly (hourly agents) — daily agents self-throttle. */
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) return unauthorizedCronResponse(request);
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  try {
    const results = await runDueAutomations({ force: request.nextUrl.searchParams.get("force") === "1" });
    return NextResponse.json({ ok: true, ran: results.length, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
