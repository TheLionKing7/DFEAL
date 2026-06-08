import {
  dbRowToOpportunity,
} from "@/lib/db/map-opportunity";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { classifyOpportunity } from "@/lib/opportunity/classify";
import { dedupeHotOpportunityRows, dedupeOpportunityCards } from "@/lib/opportunity/dedupe";
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

function isGrantSource(source: string, raw?: Record<string, unknown> | null) {
  if (source === "grants_gov") return true;
  if (source === "sba") return raw?.funding_type === "sba_grant_program";
  return false;
}

export async function loadExplorePageData() {
  const supabase = getSupabaseAdmin();

  const { data: hotRows, error: hotError } = await supabase
    .from("hot_opportunities")
    .select("*")
    .order("fit_score", { ascending: false })
    .limit(40);

  if (hotError) throw new Error(hotError.message);

  const dedupedHotRows = dedupeHotOpportunityRows(hotRows ?? []);

  const hot = dedupeOpportunityCards(
    dedupedHotRows
      .map((row) => {
        const opp = dbRowToOpportunity(row);
        return toCard(opp, {
          fit_score: row.fit_score,
          go_no_go: row.go_no_go,
          score_rationale: row.score_rationale,
        });
      })
      .filter((c) => c.category === "contract_opportunity"),
  );

  const { data: recentRows, error: recentError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .order("posted_date", { ascending: false, nullsFirst: false })
    .limit(120);

  if (recentError) throw new Error(recentError.message);

  const recent = (recentRows ?? []).map((row) => toCard(dbRowToOpportunity(row)));

  const contracts = dedupeOpportunityCards(
    recent.filter((c) => c.category === "contract_opportunity"),
  );
  const events = recent.filter((c) => c.category === "industry_event");

  const recommended = dedupeOpportunityCards(
    (hot.length > 0 ? hot : contracts)
      .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0)),
  ).slice(0, 8);

  const featured = recommended.slice(0, 5);

  const [{ data: federalRows }, { data: stateRows }, { data: grantRows }] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select("*")
        .eq("status", "active")
        .eq("source", "sam")
        .order("posted_date", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("opportunities")
        .select("*")
        .eq("status", "active")
        .in("source", [
          "bidbuy_il",
          "georgia",
          "ohio",
          "bonfire",
          "stateuniv_il",
          "education_il",
          "demandstar",
        ])
        .order("posted_date", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("opportunities")
        .select("*")
        .eq("status", "active")
        .in("source", ["grants_gov", "sba"])
        .order("posted_date", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

  const federalItems = dedupeOpportunityCards(
    (federalRows ?? [])
      .map((row) => toCard(dbRowToOpportunity(row)))
      .filter((c) => c.category === "contract_opportunity")
      .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0)),
  ).slice(0, 4);

  const stateLocalItems = dedupeOpportunityCards(
    (stateRows ?? [])
      .map((row) => toCard(dbRowToOpportunity(row)))
      .filter((c) => c.category === "contract_opportunity")
      .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0)),
  ).slice(0, 4);

  const grantItems = dedupeOpportunityCards(
    (grantRows ?? [])
      .filter((row) =>
        isGrantSource(
          row.source as string,
          row.raw_json as Record<string, unknown> | null,
        ),
      )
      .map((row) => toCard(dbRowToOpportunity(row)))
      .filter((c) => c.category === "contract_opportunity")
      .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0)),
  ).slice(0, 4);

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
