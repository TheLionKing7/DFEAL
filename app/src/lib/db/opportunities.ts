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

  const { error } = await supabase.from("opportunities").upsert(rows, {
    onConflict: "source,external_id",
  });

  if (error) {
    throw new Error(`Failed to upsert opportunities: ${error.message}`);
  }

  return rows.length;
}

export async function listOpportunities(options: {
  limit?: number;
  offset?: number;
  source?: string;
  naics?: string;
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

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(dbRowToOpportunity);
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
