import { NextResponse } from "next/server";
import { getCronSecretConfigured } from "@/lib/cron/auth";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export function GET() {
  return NextResponse.json({
    ok: true,
    cron_configured: getCronSecretConfigured(),
    supabase_configured: isDatabaseConfigured(),
    sam_configured: Boolean(process.env.SAM_GOV_API_KEY?.trim()),
  });
}
