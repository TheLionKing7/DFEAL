import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import type { Json } from "@/lib/db/database.types";

export interface AnalysisRun {
  id: string;
  opportunity_id: string;
  user_email: string | null;
  provider: string | null;
  fit_score: number | null;
  go_no_go: string | null;
  result_json: Record<string, unknown>;
  created_at: string;
}

export async function listAnalysisRuns(
  opportunityId: string,
  limit = 5,
): Promise<AnalysisRun[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("analysis_runs")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AnalysisRun[];
}

export async function saveAnalysisRun(input: {
  opportunity_id: string;
  user_email?: string;
  provider: string;
  fit_score: number;
  go_no_go: "go" | "no_go" | "review";
  result_json: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("analysis_runs")
    .insert({ ...input, result_json: input.result_json as Json })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as AnalysisRun;
}

export async function getLatestScore(opportunityId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("opportunity_scores")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("scored_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
