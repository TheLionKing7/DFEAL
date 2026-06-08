import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import type { PursuitStage } from "@/shared/opportunity-lanes";

export interface PursuitItem {
  id: string;
  opportunity_id: string;
  user_email: string;
  notes: string | null;
  pursuit_stage: PursuitStage;
  created_at: string;
  updated_at: string;
  title?: string;
  agency_name?: string | null;
  response_deadline?: string | null;
  fit_score?: number | null;
  go_no_go?: string | null;
}

export async function listPursuits(userEmail: string): Promise<PursuitItem[]> {
  const supabase = getSupabaseAdmin();
  const { data: pursuits, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("user_email", userEmail)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!pursuits?.length) return [];

  const ids = pursuits.map((r) => r.opportunity_id);

  const [{ data: opps }, { data: scoreRows }] = await Promise.all([
    supabase.from("opportunities").select("id, title, agency_name, response_deadline").in("id", ids),
    supabase
      .from("opportunity_scores")
      .select("opportunity_id, fit_score, go_no_go, scored_at")
      .in("opportunity_id", ids)
      .order("scored_at", { ascending: false }),
  ]);

  const oppMap = new Map((opps ?? []).map((o) => [o.id, o]));
  const scores: Record<string, { fit_score: number; go_no_go: string }> = {};
  for (const row of scoreRows ?? []) {
    if (!scores[row.opportunity_id]) {
      scores[row.opportunity_id] = {
        fit_score: row.fit_score,
        go_no_go: row.go_no_go,
      };
    }
  }

  return pursuits.map((row) => {
    const opp = oppMap.get(row.opportunity_id);
    const score = scores[row.opportunity_id];
    return {
      id: row.id,
      opportunity_id: row.opportunity_id,
      user_email: row.user_email,
      notes: row.notes,
      pursuit_stage: (row.pursuit_stage ?? "tracking") as PursuitStage,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
      title: opp?.title,
      agency_name: opp?.agency_name,
      response_deadline: opp?.response_deadline,
      fit_score: score?.fit_score ?? null,
      go_no_go: score?.go_no_go ?? null,
    };
  });
}

export async function getPursuit(userEmail: string, opportunityId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("user_email", userEmail)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function addPursuit(
  userEmail: string,
  opportunityId: string,
  notes?: string,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlists")
    .upsert(
      {
        user_email: userEmail,
        opportunity_id: opportunityId,
        notes: notes ?? null,
        pursuit_stage: "tracking",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email,opportunity_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePursuit(
  userEmail: string,
  opportunityId: string,
  patch: { notes?: string; pursuit_stage?: PursuitStage },
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlists")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_email", userEmail)
    .eq("opportunity_id", opportunityId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removePursuit(userEmail: string, opportunityId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("user_email", userEmail)
    .eq("opportunity_id", opportunityId);

  if (error) throw new Error(error.message);
}

export async function countPursuits(userEmail: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("watchlists")
    .select("*", { count: "exact", head: true })
    .eq("user_email", userEmail);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
