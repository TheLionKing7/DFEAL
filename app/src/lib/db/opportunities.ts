import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import {
  dbRowToOpportunity,
  hotRowToDisplay,
  opportunityToDbRow,
} from "@/lib/db/map-opportunity";
import type { Opportunity } from "@/shared/types/opportunity";

export async function upsertOpportunities(
  opportunities: Opportunity[],
): Promise<number> {
  if (opportunities.length === 0) return 0;

  const supabase = getSupabaseAdmin();
  const rows = opportunities.map(opportunityToDbRow);
  const chunkSize = 25;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("opportunities").upsert(chunk, {
      onConflict: "source,external_id",
    });

    if (error) {
      throw new Error(`Failed to upsert opportunities: ${error.message}`);
    }
    upserted += chunk.length;
  }

  return upserted;
}

export async function listOpportunities(options: {
  limit?: number;
  offset?: number;
  source?: string;
  naics?: string;
  q?: string;
  marketTier?: string;
}): Promise<Opportunity[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .order("posted_date", { ascending: false, nullsFirst: false })
    .range(
      options.offset ?? 0,
      (options.offset ?? 0) + (options.limit ?? 25) - 1,
    );

  if (options.source) query = query.eq("source", options.source);
  if (options.naics) query = query.eq("naics", options.naics);
  if (options.marketTier) query = query.eq("market_tier", options.marketTier);
  if (options.q?.trim()) {
    const term = options.q.trim().replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${term}%,agency_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(dbRowToOpportunity);
}

export async function listAgencySummaries(limit = 50) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("opportunities")
    .select("agency_id, agency_name")
    .eq("status", "active")
    .not("agency_name", "is", null);

  if (error) throw new Error(error.message);

  const counts = new Map<string, { agency_id: string | null; agency_name: string; count: number }>();
  for (const row of data ?? []) {
    if (!row.agency_name) continue;
    const key = row.agency_name;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { agency_id: row.agency_id, agency_name: row.agency_name, count: 1 });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function listHotOpportunities(limit = 12) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("hot_opportunities")
    .select("*")
    .order("fit_score", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(hotRowToDisplay);
}

export async function listUnscoredOpportunityIds(limit = 100): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  const { data: active, error: activeError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("status", "active")
    .order("posted_date", { ascending: false, nullsFirst: false })
    .limit(limit * 2);

  if (activeError) throw new Error(activeError.message);
  if (!active?.length) return [];

  const ids = active.map((r) => r.id);
  const { data: scored, error: scoredError } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id")
    .in("opportunity_id", ids);

  if (scoredError) throw new Error(scoredError.message);

  const scoredSet = new Set((scored ?? []).map((r) => r.opportunity_id));
  return ids.filter((id) => !scoredSet.has(id)).slice(0, limit);
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? dbRowToOpportunity(data) : null;
}

export async function updateIngestCursor(
  source: string,
  patch: {
    last_status: "success" | "failed" | "running";
    rows_ingested?: number;
    last_error?: string | null;
    last_sync_at?: string;
  },
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("ingest_cursors")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("source", source);

  if (error) throw new Error(error.message);
}

export async function insertOpportunityScores(
  scores: {
    opportunity_id: string;
    fit_score: number;
    go_no_go: "go" | "no_go" | "review";
    rationale: string;
    digest_batch_id?: string;
  }[],
) {
  if (scores.length === 0) return;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("opportunity_scores").insert(scores);
  if (error) throw new Error(error.message);
}

export async function createDigestRun(runType = "daily_hot_opportunities") {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("digest_runs")
    .insert({ run_type: runType, status: "running" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function finishDigestRun(
  id: string,
  patch: {
    status: "success" | "failed";
    opportunities_scored: number;
    hot_count: number;
    email_sent?: boolean;
    error_message?: string | null;
  },
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("digest_runs")
    .update({
      ...patch,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
