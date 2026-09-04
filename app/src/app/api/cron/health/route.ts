import { NextResponse } from "next/server";
import { getCronSecretConfigured } from "@/lib/cron/auth";
import { freshnessOrFilter } from "@/lib/db/freshness";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { listConnectorStatus } from "@/lib/sled/registry";

export async function GET() {
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

      const [{ data: cursors }, { data: runs }, counts] = await Promise.all([
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
