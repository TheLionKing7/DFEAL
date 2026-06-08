import { NextResponse } from "next/server";
import { getCronSecretConfigured } from "@/lib/cron/auth";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { listConnectorStatus } from "@/lib/sled/registry";

export function GET() {
  return NextResponse.json({
    ok: true,
    cron_configured: getCronSecretConfigured(),
    supabase_configured: isDatabaseConfigured(),
    sam_configured: Boolean(process.env.SAM_GOV_API_KEY?.trim()),
    sled_connectors: listConnectorStatus(),
    sled_credentials: {
      demandstar: Boolean(
        process.env.DEMANDSTAR_USERNAME?.trim() && process.env.DEMANDSTAR_PASSWORD?.trim(),
      ),
      ohiobuys: Boolean(
        process.env.OHIOBUYS_USERNAME?.trim() && process.env.OHIOBUYS_PASSWORD?.trim(),
      ),
      bonfire_portals: Boolean(process.env.BONFIRE_PORTALS?.trim()),
    },
  });
}
