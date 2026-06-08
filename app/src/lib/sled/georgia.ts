import {
  governmentTypeToMarketTier,
  matchesDfealSledKeywords,
  parseGeorgiaDateString,
  sledOpportunityId,
} from "@/lib/sled/normalize";
import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";
import { sledFetch, warmCookieJar } from "@/lib/sled/http";
import type { Opportunity } from "@/shared/types/opportunity";

const GPR_BASE = "https://ssl.doas.state.ga.us/gpr";

interface GeorgiaEventRow {
  esourceNumber: string;
  esourceNumberKey: string;
  title: string;
  agencyName: string;
  agencyCode?: string;
  closingDateStr?: string;
  postingDateStr?: string;
  status?: string;
  governmentType?: string;
  bidProcessType?: string;
  esourceDescription?: string | null;
  sourceId?: string;
  electronicBid?: boolean;
}

interface GeorgiaSearchResponse {
  data: GeorgiaEventRow[] | null;
  recordsFiltered?: number;
  message?: string | null;
}

function buildSearchBody(options: SledFetchOptions): string {
  const params = new URLSearchParams();
  params.set("draw", "1");
  params.set("start", "0");
  params.set("length", String(options.limit ?? 100));
  params.set("search[value]", "");
  params.set("search[regex]", "false");
  params.set("order[0][column]", "5");
  params.set("order[0][dir]", "asc");
  params.set("eventStatus", "OPEN");
  params.set("responseType", "");
  params.set("eventIdTitle", options.keyword ?? "");
  params.set("govType", "ALL");
  params.set("govEntity", "");
  params.set("catType", "");
  params.set("eventProcessType", "");
  params.set("dateRangeType", "");
  params.set("rangeStartDate", "");
  params.set("rangeEndDate", "");
  params.set("isReset", "false");
  params.set("persisted", "false");
  params.set("refreshSearchData", "true");
  return params.toString();
}

function normalizeGeorgiaRow(row: GeorgiaEventRow): Opportunity {
  const now = new Date().toISOString();
  const marketTier = governmentTypeToMarketTier(row.governmentType);
  const detailUrl = `${GPR_BASE}/eventDetails?eSourceNumber=${encodeURIComponent(row.esourceNumberKey)}&sourceSystemType=${encodeURIComponent(row.sourceId ?? "gpr20")}`;

  return {
    id: sledOpportunityId("georgia", row.esourceNumberKey),
    source: "georgia",
    external_id: row.esourceNumberKey,
    notice_type: (row.bidProcessType ?? "").toLowerCase().includes("rfi")
      ? "sources_sought"
      : "solicitation",
    title: row.title,
    description: row.esourceDescription ?? null,
    agency_id: row.agencyCode ?? null,
    agency_name: row.agencyName,
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: { state: "GA", country: "US" },
    estimated_value_usd: null,
    response_deadline: parseGeorgiaDateString(row.closingDateStr),
    posted_date: parseGeorgiaDateString(row.postingDateStr),
    updated_at: now,
    status: "active",
    sam_url: null,
    source_url: detailUrl,
    raw_data: row as unknown as Record<string, unknown>,
  };
}

export async function fetchGeorgiaOpportunities(
  options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const jar = new Map<string, string>();
  await warmCookieJar(`${GPR_BASE}/index`, jar);

  const response = await sledFetch(`${GPR_BASE}/eventSearch`, {
    method: "POST",
    cookieJar: jar,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${GPR_BASE}/index`,
    },
    body: buildSearchBody(options),
  });

  if (!response.ok) {
    throw new Error(`Georgia GPR HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GeorgiaSearchResponse;
  if (payload.message) {
    throw new Error(`Georgia GPR: ${payload.message}`);
  }

  const rows = payload.data ?? [];
  const filtered = rows.filter((row) =>
    options.keyword
      ? true
      : matchesDfealSledKeywords(row.title, row.esourceDescription),
  );

  return {
    source: "georgia",
    fetched: rows.length,
    opportunities: filtered.map(normalizeGeorgiaRow),
    message:
      filtered.length < rows.length
        ? `Filtered to ${filtered.length} DFEAL-relevant of ${rows.length} open events`
        : undefined,
  };
}

export const GEORGIA_CONNECTOR_META = {
  id: "georgia" as const,
  name: "Georgia Procurement Registry",
  marketTier: "state" as const,
  phase: 3 as const,
  status: "live" as const,
  description: "Open events from ssl.doas.state.ga.us via public eventSearch API",
};
