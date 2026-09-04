import {
  demandStarBidUrl,
  demandStarLogin,
  demandStarSearchBids,
  type DemandStarBidRow,
} from "@/lib/sled/demandstar-client";
import {
  governmentTypeToMarketTier,
  matchesDfealSledKeywords,
  parseSledDate,
  sledOpportunityId,
} from "@/lib/sled/normalize";
import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";
import type { NoticeType, Opportunity } from "@/shared/types/opportunity";

const MAX_PAGES = 8;
const PAGE_SIZE_HINT = 25;

function inferNoticeType(title: string): NoticeType {
  const t = title.toLowerCase();
  if (/rfp|request for proposal/.test(t)) return "solicitation";
  if (/rfi|sources sought/.test(t)) return "sources_sought";
  if (/ifb|invitation for bid/.test(t)) return "solicitation";
  return "solicitation";
}

function resolveState(row: DemandStarBidRow): string | null {
  const state = row.state ?? row.stateName ?? row.agencyState;
  if (typeof state === "string" && state.trim()) {
    const code = state.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  return null;
}

function resolveMarketTier(row: DemandStarBidRow): "state" | "local" | "education" {
  if (row.governmentType && typeof row.governmentType === "string") {
    return governmentTypeToMarketTier(row.governmentType);
  }
  const agency = (row.agency ?? "").toLowerCase();
  if (/school|district|university|college|education|k-12|k12/.test(agency)) {
    return "education";
  }
  if (/city|county|village|town|municipal|transit|park district/.test(agency)) {
    return "local";
  }
  return "state";
}

function normalizeDemandStarBid(row: DemandStarBidRow): Opportunity {
  const now = new Date().toISOString();
  const bidId = String(row.bidId);
  const title = (row.bidName ?? row.bidIdentifier ?? `DemandStar bid ${bidId}`).trim();
  const deadline = parseSledDate(row.dueDateTime ?? row.dueDate ?? null);
  const posted = parseSledDate(row.broadCastDate ?? null);
  const state = resolveState(row);
  const marketTier = resolveMarketTier(row);

  return {
    id: sledOpportunityId("demandstar", bidId),
    source: "demandstar",
    external_id: bidId,
    notice_type: inferNoticeType(title),
    title,
    description: [
      title,
      row.agency ? `Agency: ${row.agency}` : "",
      row.bidIdentifier ? `Bid #: ${row.bidIdentifier}` : "",
      row.statusName ? `Status: ${row.statusName}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    agency_id: null,
    agency_name: row.agency ?? "DemandStar network",
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: state ? { state, country: "US" } : null,
    estimated_value_usd: null,
    response_deadline: deadline,
    posted_date: posted,
    updated_at: now,
    status: "active",
    archived_at: null,
    sam_url: null,
    source_url: demandStarBidUrl(bidId),
    raw_data: { ...row, market_tier: marketTier } as Record<string, unknown>,
  };
}

function isAfterSince(row: DemandStarBidRow, since?: Date): boolean {
  if (!since) return true;
  const posted = parseSledDate(row.broadCastDate ?? null);
  if (!posted) return true;
  return new Date(posted).getTime() >= since.getTime();
}

function parseStateFilter(): string[] {
  const raw = process.env.DEMANDSTAR_STATES?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
}

export async function fetchDemandStarOpportunities(
  options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const user = process.env.DEMANDSTAR_USERNAME?.trim();
  const pass = process.env.DEMANDSTAR_PASSWORD?.trim();

  if (!user || !pass) {
    return {
      source: "demandstar",
      fetched: 0,
      opportunities: [],
      message: "Set DEMANDSTAR_USERNAME and DEMANDSTAR_PASSWORD to enable DemandStar ingest.",
    };
  }

  try {
    const auth = await demandStarLogin(user, pass);
    const states = parseStateFilter();
    const limit = options.limit ?? 150;
    const opportunities: Opportunity[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES && opportunities.length < limit; page += 1) {
      const data = await demandStarSearchBids(auth.token, {
        bidStatus: "AC",
        states: states.length ? states : undefined,
        sortBy: "broadCastDate",
        sortOrder: "DESC",
        bidscurrentPage: page,
        initialRequest: page === 1,
      });

      const rows = data.result ?? [];
      if (rows.length === 0) break;

      for (const row of rows) {
        if (!isAfterSince(row, options.since)) continue;
        const title = row.bidName ?? row.bidIdentifier ?? "";
        if (options.keyword && !title.toLowerCase().includes(options.keyword.toLowerCase())) {
          continue;
        }
        if (!matchesDfealSledKeywords(title, row.agency)) continue;

        const key = String(row.bidId);
        if (seen.has(key)) continue;
        seen.add(key);
        opportunities.push(normalizeDemandStarBid(row));
        if (opportunities.length >= limit) break;
      }

      const total = data.total ?? 0;
      if (page * PAGE_SIZE_HINT >= total) break;
    }

    return {
      source: "demandstar",
      fetched: opportunities.length,
      opportunities,
      message:
        states.length > 0
          ? `Active DemandStar bids (${states.join(", ")}) — ${opportunities.length} matched DFEAL keywords`
          : `Active DemandStar bids nationwide — ${opportunities.length} matched DFEAL keywords`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DemandStar ingest failed";
    return {
      source: "demandstar",
      fetched: 0,
      opportunities: [],
      message,
    };
  }
}

export const DEMANDSTAR_CONNECTOR_META = {
  id: "demandstar" as const,
  name: "DemandStar (Euna OpenBids)",
  marketTier: "state" as const,
  phase: 3 as const,
  status: "live" as const,
  description: "State, local, and education bids via authenticated OpenBids API",
};
