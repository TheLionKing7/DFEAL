import { getDfealNaicsCodes } from "@/config/dfeal-profile";
import {
  baseGrantOpportunity,
  grantOpportunityId,
  parseGrantsGovDate,
} from "@/lib/grants/normalize";
import type { FederalGrantFetchOptions, FederalGrantFetchResult } from "@/lib/grants/types";

const SEARCH_URL = "https://api.grants.gov/v1/api/search2";
const PAGE_SIZE = 50;

interface GrantsGovHit {
  id: string;
  number: string;
  title: string;
  agencyCode: string;
  agency: string;
  openDate: string;
  closeDate: string;
  oppStatus: string;
  docType: string;
  cfdaList?: string[];
}

interface Search2Response {
  errorcode: number;
  data?: {
    hitCount: number;
    oppHits: GrantsGovHit[];
  };
}

function dfealGrantKeywords(): string[] {
  return [
    "health",
    "healthcare",
    "clinical",
    "research",
    "program management",
    "consulting",
    "training",
    "medical",
    "biomedical",
    "NIH",
  ];
}

async function searchGrantsGov(params: {
  keyword?: string;
  agencies?: string;
  rows?: number;
  startRecordNum?: number;
}): Promise<GrantsGovHit[]> {
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: params.keyword ?? "",
      agencies: params.agencies ?? "",
      oppStatuses: "posted|forecasted",
      rows: params.rows ?? PAGE_SIZE,
      startRecordNum: params.startRecordNum ?? 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`Grants.gov search2 HTTP ${res.status}`);
  }

  const data = (await res.json()) as Search2Response;
  if (data.errorcode !== 0 || !data.data?.oppHits) {
    return [];
  }
  return data.data.oppHits;
}

function normalizeHit(hit: GrantsGovHit) {
  const cfda = hit.cfdaList?.join(", ") ?? "";
  return baseGrantOpportunity({
    id: grantOpportunityId("grants_gov", hit.number || hit.id),
    source: "grants_gov",
    external_id: hit.number || hit.id,
    title: hit.title,
    description: [
      hit.title,
      hit.agency ? `Agency: ${hit.agency} (${hit.agencyCode})` : "",
      cfda ? `CFDA/ALN: ${cfda}` : "",
      hit.oppStatus ? `Status: ${hit.oppStatus}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    agency_name: hit.agency || hit.agencyCode || "Federal grant agency",
    response_deadline: parseGrantsGovDate(hit.closeDate),
    posted_date: parseGrantsGovDate(hit.openDate),
    source_url: `https://www.grants.gov/search-results-detail/${hit.id}`,
    notice_type: "other",
    raw_data: {
      ...hit,
      lane: "grants",
      funding_type: "grant",
    },
  });
}

export async function fetchGrantsGovOpportunities(
  options: FederalGrantFetchOptions = {},
): Promise<FederalGrantFetchResult> {
  const limit = options.limit ?? 120;
  const seen = new Set<string>();
  const merged: ReturnType<typeof normalizeHit>[] = [];

  const queries: { keyword?: string; agencies?: string; label: string }[] = [
    { agencies: "HHS-NIH11", label: "NIH" },
    { agencies: "HHS", label: "HHS" },
    ...dfealGrantKeywords().map((keyword) => ({ keyword, label: keyword })),
  ];

  if (options.keyword) {
    queries.unshift({ keyword: options.keyword, label: options.keyword });
  }

  for (const query of queries) {
    if (merged.length >= limit) break;

    let start = 0;
    while (merged.length < limit && start < 200) {
      const hits = await searchGrantsGov({
        keyword: query.keyword,
        agencies: query.agencies,
        rows: Math.min(PAGE_SIZE, limit - merged.length),
        startRecordNum: start,
      });

      if (hits.length === 0) break;

      for (const hit of hits) {
        const key = hit.number || hit.id;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(normalizeHit(hit));
        if (merged.length >= limit) break;
      }

      if (hits.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }
  }

  const naics = getDfealNaicsCodes();
  return {
    source: "grants_gov",
    fetched: merged.length,
    opportunities: merged.slice(0, limit),
    message: `Grants.gov: ${merged.length} posted/forecasted grants (NIH/HHS + DFEAL keywords; NAICS ${naics.join(", ")})`,
  };
}

export const GRANTS_GOV_CONNECTOR_META = {
  id: "grants_gov" as const,
  name: "Grants.gov",
  marketTier: "federal" as const,
  phase: 2 as const,
  status: "live" as const,
  description: "Federal grant opportunities via Grants.gov search2 API (NIH/HHS prioritized)",
};
