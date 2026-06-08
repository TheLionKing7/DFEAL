import * as cheerio from "cheerio";
import {
  matchesDfealSledKeywords,
  parseIllinoisBidDate,
  sledOpportunityId,
} from "@/lib/sled/normalize";
import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";
import { sledFetch, warmCookieJar } from "@/lib/sled/http";
import type { Opportunity, NoticeType } from "@/shared/types/opportunity";

const BASE = "https://www.bidbuy.illinois.gov";
const OPEN_BIDS = `${BASE}/bso/view/search/external/advancedSearchBid.xhtml?openBids=true`;
const PAGE_SIZE = 25;

/** Statuses that indicate an open solicitation on BidBuy public bulletin */
const CLOSED_STATUSES = new Set([
  "bid to po",
  "evaluated",
  "approved",
  "awarded",
  "closed",
  "cancelled",
]);

interface BidBuyRow {
  bidNumber: string;
  organization: string;
  buyer: string;
  description: string;
  openingDate: string;
  status: string;
  alternateId: string;
  detailPath: string;
}

function parseResultRows(html: string): BidBuyRow[] {
  const wrapped = /<table/i.test(html) ? html : `<table><tbody>${html}</tbody></table>`;
  const $ = cheerio.load(wrapped);
  const rows: BidBuyRow[] = [];

  $("table tbody tr, tr[data-ri]").each((_, el) => {
    const cells = $(el)
      .find("td")
      .map((__, td) => $(td).text().trim().replace(/\s+/g, " "))
      .get();
    if (cells.length < 7) return;

    const detailLink =
      $(el).find('a[href*="bidDetail"]').first().attr("href") ??
      $(el).find("a[href*='docId']").first().attr("href");
    if (!detailLink) return;

    const bidNumber = cells[0] || cells[1];
    if (!/\d{2}-\d+[A-Z]+/.test(bidNumber)) return;

    rows.push({
      bidNumber,
      organization: cells[2] ?? "",
      buyer: cells[5] ?? "",
      description: cells[6] ?? "",
      openingDate: cells[7] ?? "",
      status: (cells[10] ?? cells[9] ?? "").trim(),
      alternateId: cells[11] ?? "",
      detailPath: detailLink,
    });
  });

  return rows;
}

function inferNoticeType(description: string, bidNumber: string): NoticeType {
  const text = `${description} ${bidNumber}`.toLowerCase();
  if (/rfp|request for proposal/.test(text)) return "solicitation";
  if (/rfi|sources sought/.test(text)) return "sources_sought";
  if (/ifb|invitation for bid|bid\b/.test(text)) return "solicitation";
  if (/award|sole source|change order|lease award/.test(text)) return "special_notice";
  return "solicitation";
}

function isActiveIllinoisBid(row: BidBuyRow): boolean {
  const status = row.status.toLowerCase();
  if (status && CLOSED_STATUSES.has(status)) return false;

  const desc = row.description.toLowerCase();
  if (/change order notice|notice of lease award|award in process/.test(desc)) {
    return matchesDfealSledKeywords(row.description, row.organization);
  }
  return true;
}

function normalizeBidBuyRow(row: BidBuyRow): Opportunity {
  const now = new Date().toISOString();
  const detailUrl = row.detailPath.startsWith("http")
    ? row.detailPath
    : `${BASE}${row.detailPath}`;

  return {
    id: sledOpportunityId("bidbuy_il", row.bidNumber),
    source: "bidbuy_il",
    external_id: row.bidNumber,
    notice_type: inferNoticeType(row.description, row.bidNumber),
    title: row.description || row.bidNumber,
    description: `${row.description}\n\nOrganization: ${row.organization}\nBuyer: ${row.buyer}\nBid #: ${row.bidNumber}${row.alternateId ? `\nAlternate ID: ${row.alternateId}` : ""}`,
    agency_id: null,
    agency_name: row.organization || "State of Illinois",
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: { state: "IL", country: "US" },
    estimated_value_usd: null,
    response_deadline: parseIllinoisBidDate(row.openingDate),
    posted_date: null,
    updated_at: now,
    status: "active",
    sam_url: null,
    source_url: detailUrl,
    raw_data: row as unknown as Record<string, unknown>,
  };
}

async function loadOpenBidsPage(jar: Map<string, string>) {
  const res = await sledFetch(OPEN_BIDS, { cookieJar: jar });
  if (!res.ok) throw new Error(`BidBuy Illinois HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  return {
    html,
    viewState: $('input[name="javax.faces.ViewState"]').attr("value") ?? "",
    csrf: $("#bidSearchResultsForm input[name='_csrf']").attr("value") ?? "",
  };
}

async function fetchBidBuyPage(
  jar: Map<string, string>,
  first: number,
  viewState: string,
  csrf: string,
): Promise<string> {
  if (first === 0) {
    const { html } = await loadOpenBidsPage(jar);
    return html;
  }

  const body = new URLSearchParams();
  body.set("javax.faces.partial.ajax", "true");
  body.set("javax.faces.source", "bidSearchResultsForm:bidResultId");
  body.set("javax.faces.partial.execute", "bidSearchResultsForm:bidResultId");
  body.set("javax.faces.partial.render", "bidSearchResultsForm:bidResultId");
  body.set("bidSearchResultsForm:bidResultId", "bidSearchResultsForm:bidResultId");
  body.set("bidSearchResultsForm:bidResultId_pagination", "true");
  body.set("bidSearchResultsForm:bidResultId_first", String(first));
  body.set("bidSearchResultsForm:bidResultId_rows", String(PAGE_SIZE));
  body.set("bidSearchResultsForm:bidResultId_skipChildren", "true");
  body.set("bidSearchResultsForm:bidResultId_encodeFeature", "true");
  body.set("bidSearchResultsForm", "bidSearchResultsForm");
  body.set("_csrf", csrf);
  body.set("javax.faces.ViewState", viewState);

  const res = await sledFetch(OPEN_BIDS, {
    method: "POST",
    cookieJar: jar,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Faces-Request": "partial/ajax",
      "X-Requested-With": "XMLHttpRequest",
      Referer: OPEN_BIDS,
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`BidBuy pagination HTTP ${res.status}`);
  const xml = await res.text();
  return xml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] ?? "";
}

export async function fetchBidBuyIllinoisOpportunities(
  options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const jar = new Map<string, string>();
  await warmCookieJar(`${BASE}/bso/`, jar);

  const limit = options.limit ?? 150;
  const maxPages = Math.ceil(limit / PAGE_SIZE);

  const { html, viewState, csrf } = await loadOpenBidsPage(jar);
  const allRows: BidBuyRow[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < maxPages; page++) {
    const chunk =
      page === 0 ? html : await fetchBidBuyPage(jar, page * PAGE_SIZE, viewState, csrf);
    const parsed = parseResultRows(chunk);
    if (parsed.length === 0) break;

    for (const row of parsed) {
      if (seen.has(row.bidNumber)) continue;
      seen.add(row.bidNumber);
      allRows.push(row);
    }

    if (parsed.length < PAGE_SIZE) break;
  }

  const filtered = allRows.filter((row) => {
    if (!isActiveIllinoisBid(row)) return false;
    if (!options.keyword) return true;
    const hay = `${row.description} ${row.organization} ${row.bidNumber}`.toLowerCase();
    return hay.includes(options.keyword.toLowerCase());
  });

  const opportunities = filtered.slice(0, limit).map(normalizeBidBuyRow);

  return {
    source: "bidbuy_il",
    fetched: allRows.length,
    opportunities,
    message: `Illinois: ingested ${opportunities.length} active open bids (${allRows.length} total on bulletin)`,
  };
}

export const BIDBUY_IL_CONNECTOR_META = {
  id: "bidbuy_il" as const,
  name: "BidBuy Illinois",
  marketTier: "state" as const,
  phase: 3 as const,
  status: "live" as const,
  description: "Open bids from Illinois BidBuy procurement bulletin (home state priority)",
};
