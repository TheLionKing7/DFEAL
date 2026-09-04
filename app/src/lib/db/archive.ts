import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export interface ArchiveResult {
  archivedCount: number;
  archivedIds: string[];
}

/**
 * Archive all stale/expired opportunities by invoking the
 * `archive_stale_opportunities()` PostgreSQL function.
 *
 * Policy: opportunities have a 7-day freshness window. Anything whose
 * deadline has expired for more than 7 days (or is undated and 7+ days
 * old) is archived so only fresh opportunities surface for clients.
 *
 * Called automatically by the daily pipeline.
 */
export async function archiveStaleOpportunities(): Promise<ArchiveResult> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("archive_stale_opportunities");

  if (error) {
    throw new Error(`Archive failed: ${error.message}`);
  }

  // The RPC returns a table row: { archived_count, archived_ids }
  if (data && typeof data === "object") {
    // RPC may return a single row or an array depending on how supabase-js handles it
    const row = Array.isArray(data) ? data[0] : data;
    return {
      archivedCount: (row as Record<string, unknown>).archived_count as number ?? 0,
      archivedIds: (row as Record<string, unknown>).archived_ids as string[] ?? [],
    };
  }

  return { archivedCount: 0, archivedIds: [] };
}