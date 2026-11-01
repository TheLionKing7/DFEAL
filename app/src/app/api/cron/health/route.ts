import { NextRequest, NextResponse } from "next/server";
import { getCronSecretConfigured, verifyCronAuth } from "@/lib/cron/auth";
import { freshnessOrFilter } from "@/lib/db/freshness";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { listConnectorStatus } from "@/lib/sled/registry";

/**
 * Public liveness probe. Detailed diagnostics (connector config, ingest
 * cursors, run history) are only returned to callers holding CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  }

  const payload: Record<string, unknown> = {
    ok: true,
    cron_configured: getCronSecretConfigured(),
    supabase_configured: isDatabaseConfigured(),
    sam_configured: Boolean(process.env.SAM_GOV_API_KEY?.trim()),
    sled_credentials: {
      demandstar: Boolean(
        process.env.DEMANDSTAR_USERNAME?.trim() && process.env.DEMANDSTAR_PASSWORD?.trim(),
      ),
      ohiobuys: Boolean(
        process.env.OHIOBUYS_USERNAME?.trim() && process.env.OHIOBUYS_PASSWORD?.trim(),
      ),
      bonfire_portals: Boolean(process.env.BONFIRE_PORTALS?.trim()),
    },
    sled_connectors: listConnectorStatus(),
  };

  if (isDatabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();

      const [{ data: cursors }, { data: runs }, { count: firmCount }, counts] = await Promise.all([
        supabase
          .from("ingest_cursors")
          .select("source, last_status, last_sync_at, rows_ingested, last_error, updated_at")
          .order("source"),
        supabase
          .from("digest_runs")
          .select(
            "id, run_type, status, opportunities_scored, hot_count, started_at, finished_at, error_message",
          )
          .order("started_at", { ascending: false })
          .limit(5),
        supabase.from("firms").select("id", { count: "exact", head: true }).eq("status", "active"),
        Promise.all([
          supabase
            .from("opportunities")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
          supabase
            .from("opportunities")
            .select("id", { count: "exact", head: true })
            .eq("status", "archived"),
          supabase
            .from("opportunities")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("opportunities")
            .select("id", { count: "exact", head: true })
            .eq("status", "active")
            .or(freshnessOrFilter()),
        ]),
      ]);

      const [activeCount, archivedCount, totalCount, freshCount] = counts;

      payload.database = {
        active_firms: firmCount ?? null,
        opportunities: {
          total: totalCount.count ?? null,
          active: activeCount.count ?? null,
          archived: archivedCount.count ?? null,
          active_fresh: freshCount.count ?? null,
        },
        ingest_cursors: cursors ?? [],
        recent_digest_runs: runs ?? [],
      };
    } catch (error) {
      payload.database = {
        error: error instanceof Error ? error.message : "Database diagnostics failed",
      };
    }
  }

  return NextResponse.json(payload);
}
