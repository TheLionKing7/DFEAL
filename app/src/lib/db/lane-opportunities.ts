import { freshnessOrFilter, combineOrFilters } from "@/lib/db/freshness";
import { dbRowToOpportunity } from "@/lib/db/map-opportunity";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { scopedStates, type LaneId } from "@/lib/firms/lanes";
import type { FirmProfile } from "@/lib/firms/types";
import { classifyOpportunity } from "@/lib/opportunity/classify";
import { dedupeOpportunityCards } from "@/lib/opportunity/dedupe";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";

const SLED_TIERS: Record<Exclude<LaneId, "federal" | "grants">, string[]> = {
  home: ["state", "local", "education"],
  state: ["state"],
  local: ["local"],
  education: ["education"],
};

/** Latest firm scores for a set of opportunity ids. */
export async function loadFirmScores(firmId: string, ids: string[]) {
  const map = new Map<string, { fit_score: number; go_no_go: string; rationale: string }>();
  if (ids.length === 0) return map;
  const supabase = getSupabaseAdmin();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("opportunity_scores")
      .select("opportunity_id, fit_score, go_no_go, rationale")
      .eq("firm_id", firmId)
      .in("opportunity_id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) map.set(r.opportunity_id, r);
  }
  return map;
}

/**
 * Opportunities for one workspace lane, filtered to the firm's state scope and
 * decorated with the firm's own fit scores (sorted best-fit first).
 */
export async function listLaneOpportunities(
  firm: FirmProfile,
  lane: LaneId,
  options: { q?: string; state?: string; limit?: number } = {},
): Promise<OpportunityCardData[]> {
  const supabase = getSupabaseAdmin();
  const limit = options.limit ?? 60;
  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .order("posted_date", { ascending: false, nullsFirst: false })
    .limit(limit * 2);

  if (lane === "federal") {
    query = query.eq("source", "sam");
  } else if (lane === "grants") {
    query = query.in("source", ["grants_gov", "sba"]);
  } else {
    query = query.in("market_tier", SLED_TIERS[lane]).neq("source", "sam");
    const states =
      options.state ? [options.state] : lane === "home" ? (firm.homeState ? [firm.homeState] : []) : scopedStates(firm);
    if (states !== null) {
      if (states.length === 0) return [];
      query = query.in("place_of_performance->>state", states);
    }
  }

  const fresh = freshnessOrFilter();
  const term = options.q?.trim().replace(/[%_,()]/g, "");
  query = term
    ? query.or(combineOrFilters(`title.ilike.%${term}%,agency_name.ilike.%${term}%`, fresh))
    : query.or(fresh);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? [])
    .map(dbRowToOpportunity)
    .filter((o) => o.source !== "sba" || o.raw_data?.funding_type === "sba_grant_program");
  const scores = await loadFirmScores(firm.id, rows.map((r) => r.id));

  const cards: OpportunityCardData[] = rows.map((opp) => {
    const classification = classifyOpportunity(opp);
    const score = scores.get(opp.id);
    return {
      id: opp.id,
      title: opp.title,
      agency_name: opp.agency_name,
      naics: opp.naics,
      set_aside: opp.set_aside,
      response_deadline: opp.response_deadline,
      sam_url: opp.sam_url ?? opp.source_url,
      notice_type: opp.notice_type,
      category: classification.category,
      category_label: classification.label,
      fit_score: score?.fit_score ?? null,
      go_no_go: (score?.go_no_go as OpportunityCardData["go_no_go"]) ?? null,
      score_rationale: score?.rationale ?? null,
    };
  });

  return dedupeOpportunityCards(cards)
    .sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1))
    .slice(0, limit);
}
