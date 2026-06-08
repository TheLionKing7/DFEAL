import {
  dbRowToOpportunity,
  hotRowToDisplay,
} from "@/lib/db/map-opportunity";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { classifyOpportunity } from "@/lib/opportunity/classify";
import { scoreOpportunity } from "@/lib/scoring/score-opportunity";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";

export interface ExploreLane {
  id: string;
  label: string;
  items: OpportunityCardData[];
}

function toCard(
  opp: ReturnType<typeof dbRowToOpportunity>,
  extras?: Partial<OpportunityCardData>,
): OpportunityCardData {
  const scored = scoreOpportunity(opp);
  const classification = classifyOpportunity(opp);
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
    fit_score: extras?.fit_score ?? scored.fit_score,
    go_no_go: extras?.go_no_go ?? scored.go_no_go,
    score_rationale: extras?.score_rationale ?? scored.rationale,
  };
}

export async function loadExplorePageData() {
  const supabase = getSupabaseAdmin();

  const { data: hotRows, error: hotError } = await supabase
    .from("hot_opportunities")
    .select("*")
    .order("fit_score", { ascending: false })
    .limit(40);

  if (hotError) throw new Error(hotError.message);

  const hot = (hotRows ?? [])
    .map((row) => {
      const opp = dbRowToOpportunity(row);
      return toCard(opp, {
        fit_score: row.fit_score,
        go_no_go: row.go_no_go,
        score_rationale: row.score_rationale,
      });
    })
    .filter((c) => c.category === "contract_opportunity");

  const { data: recentRows, error: recentError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .order("posted_date", { ascending: false, nullsFirst: false })
    .limit(80);

  if (recentError) throw new Error(recentError.message);

  const recent = (recentRows ?? []).map((row) => toCard(dbRowToOpportunity(row)));

  const contracts = recent.filter((c) => c.category === "contract_opportunity");
  const events = recent.filter((c) => c.category === "industry_event");

  const recommended = (hot.length > 0 ? hot : contracts)
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 8);

  const featured = recommended.slice(0, 5);

  const laneDefs: { id: string; label: string; tier: string }[] = [
    { id: "federal", label: "Federal Contract Opportunities", tier: "federal" },
    { id: "state", label: "State & Local Contract Opportunities", tier: "state" },
    { id: "illinois", label: "Illinois Opportunities", tier: "state" },
  ];

  const popularLanes: ExploreLane[] = laneDefs.map((lane) => {
    let items = contracts;
    if (lane.id === "federal") {
      items = contracts.filter((c) => c.id.startsWith("sam-"));
    } else if (lane.id === "illinois") {
      items = contracts.filter((c) => c.id.startsWith("bidbuy_il-"));
    } else {
      items = contracts.filter(
        (c) => !c.id.startsWith("sam-") && !c.id.startsWith("bidbuy_il-"),
      );
    }
    return {
      id: lane.id,
      label: lane.label,
      items: items
        .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
        .slice(0, 4),
    };
  });

  return {
    featured,
    recommended,
    popularLanes,
    industryEvents: events.slice(0, 6),
  };
}
