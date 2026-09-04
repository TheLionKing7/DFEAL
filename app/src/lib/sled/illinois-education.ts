import { fetchBidBuyIllinoisOpportunities } from "@/lib/sled/bidbuy-illinois";
import { matchesDfealSledKeywords, sledOpportunityId } from "@/lib/sled/normalize";
import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";
import type { Opportunity } from "@/shared/types/opportunity";

const EDUCATION_AGENCY_PATTERNS = [
  /school/i,
  /university/i,
  /college/i,
  /education/i,
  /isbe/i,
  /cps/i,
  /chicago public schools/i,
  /board of education/i,
  /community college/i,
  /higher ed/i,
  /student/i,
  /district/i,
];

function isEducationAgency(opp: Opportunity): boolean {
  const hay = `${opp.agency_name ?? ""} ${opp.title} ${opp.description ?? ""}`;
  return EDUCATION_AGENCY_PATTERNS.some((p) => p.test(hay));
}

function tagEducation(opp: Opportunity): Opportunity {
  return {
    ...opp,
    id: sledOpportunityId("education_il", opp.external_id),
    source: "education_il",
    place_of_performance: { state: "IL", country: "US", ...(opp.place_of_performance ?? {}) },
    raw_data: {
      ...(opp.raw_data ?? {}),
      market_tier: "education",
      origin_source: opp.source,
    },
  };
}

/** CPS procurement reference — active solicitations are often on BidBuy; this surfaces the lane entry point */
function cpsReferenceOpportunity(): Opportunity {
  const now = new Date().toISOString();
  return {
    id: sledOpportunityId("education_il", "cps-procurement-portal"),
    source: "education_il",
    external_id: "cps-procurement-portal",
    notice_type: "special_notice",
    title: "Chicago Public Schools — Contracting Opportunities Portal",
    description:
      "Monitor CPS procurement for RFPs, RFQs, and board-approved sole source notices. Active solicitations may also appear on Illinois BidBuy.",
    agency_id: null,
    agency_name: "Chicago Public Schools",
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: { city: "Chicago", state: "IL", country: "US" },
    estimated_value_usd: null,
    response_deadline: null,
    posted_date: now,
    updated_at: now,
    status: "active",
    archived_at: null,
    sam_url: null,
    source_url: "https://www.cps.edu/procurement/contracting-opportunities",
    raw_data: {
      market_tier: "education",
      reference_only: true,
      origin_source: "cps_il",
    },
  };
}

export async function fetchIllinoisEducationOpportunities(
  options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const bidbuy = await fetchBidBuyIllinoisOpportunities({
    ...options,
    limit: options.limit ?? 200,
  });

  const educationFromBidbuy = bidbuy.opportunities
    .filter(isEducationAgency)
    .filter((opp) => matchesDfealSledKeywords(opp.title, opp.description))
    .map(tagEducation);

  const references = [cpsReferenceOpportunity()];
  const seen = new Set<string>();
  const merged: Opportunity[] = [];

  for (const opp of [...educationFromBidbuy, ...references]) {
    if (seen.has(opp.external_id)) continue;
    seen.add(opp.external_id);
    merged.push(opp);
  }

  return {
    source: "education_il",
    fetched: bidbuy.fetched,
    opportunities: merged.slice(0, options.limit ?? 80),
    message: `Illinois education: ${educationFromBidbuy.length} BidBuy matches + CPS portal reference`,
  };
}

export const EDUCATION_IL_CONNECTOR_META = {
  id: "education_il" as const,
  name: "Illinois Education (BidBuy filter)",
  marketTier: "education" as const,
  phase: 3 as const,
  status: "live" as const,
  description: "K-12 and higher-ed opportunities from Illinois BidBuy plus CPS portal",
};
