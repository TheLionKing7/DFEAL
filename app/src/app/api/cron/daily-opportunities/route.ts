import { NextRequest, NextResponse } from "next/server";
import { runDailyPipeline } from "@/lib/cron/daily-pipeline";
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
      {
        error:
          "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  try {
    const result = await runDailyPipeline();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily pipeline failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
