import {
  dbRowToOpportunity,
} from "@/lib/db/map-opportunity";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { classifyOpportunity } from "@/lib/opportunity/classify";
import { scoreOpportunity } from "@/lib/scoring/score-opportunity";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";

export interface ExploreLane {
  id: string;
  label: string;
  href: string;
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

function isFederal(_id: string, source: string) {
  return source === "sam" || _id.startsWith("sam-");
}

function isGrant(source: string, raw?: Record<string, unknown> | null) {
  if (source === "grants_gov") return true;
  if (source === "sba" && raw?.funding_type !== "sba_event") return true;
  return false;
}

function isStateLocal(id: string, source: string) {
  if (isFederal(id, source)) return false;
  if (isGrant(source)) return false;
  return (
    id.startsWith("bidbuy_il-") ||
    id.startsWith("georgia-") ||
    id.startsWith("ohio-") ||
    id.startsWith("bonfire-") ||
    id.startsWith("stateuniv_il-") ||
    id.startsWith("education_il-") ||
    source === "bidbuy_il" ||
    source === "georgia" ||
    source === "ohio" ||
    source === "demandstar" ||
    source === "bonfire" ||
    source === "stateuniv_il" ||
    source === "education_il"
  );
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
    .limit(120);

  if (recentError) throw new Error(recentError.message);

  const recent = (recentRows ?? []).map((row) => toCard(dbRowToOpportunity(row)));

  const contracts = recent.filter((c) => c.category === "contract_opportunity");
  const events = recent.filter((c) => c.category === "industry_event");

  const recommended = (hot.length > 0 ? hot : contracts)
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 8);

  const featured = recommended.slice(0, 5);

  const withSource = (recentRows ?? []).map((row) => ({
    card: toCard(dbRowToOpportunity(row)),
    source: row.source as string,
    id: row.id as string,
    raw: row.raw_json as Record<string, unknown> | null,
  }));

  const contractRows = withSource.filter((r) => r.card.category === "contract_opportunity");

  const federalItems = contractRows
    .filter((r) => isFederal(r.id, r.source))
    .map((r) => r.card)
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 4);

  const stateLocalItems = contractRows
    .filter((r) => isStateLocal(r.id, r.source))
    .map((r) => r.card)
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 4);

  const grantItems = contractRows
    .filter((r) => isGrant(r.source, r.raw))
    .map((r) => r.card)
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    .slice(0, 4);

  const popularLanes: ExploreLane[] = [
    {
      id: "federal",
      label: "Federal Contract Opportunities",
      href: "/opportunities?lane=federal",
      items: federalItems,
    },
    {
      id: "state",
      label: "State & Local Contract Opportunities",
      href: "/opportunities?lane=state",
      items: stateLocalItems,
    },
    {
      id: "grants",
      label: "Federal Grant Opportunities",
      href: "/opportunities?lane=grants",
      items: grantItems,
    },
  ];

  return {
    featured,
    recommended,
    popularLanes,
    industryEvents: events.slice(0, 6),
  };
}
