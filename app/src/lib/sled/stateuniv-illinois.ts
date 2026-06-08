import * as cheerio from "cheerio";
import { warmCookieJar, sledFetch } from "@/lib/sled/http";
import {
  matchesDfealSledKeywords,
  parseSledDate,
  sledOpportunityId,
} from "@/lib/sled/normalize";
import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";
import type { Opportunity } from "@/shared/types/opportunity";

const BASE = "https://www.procure.stateuniv.state.il.us";

const SEARCH_KEYWORDS = [
  "services",
  "consulting",
  "software",
  "health",
  "research",
  "training",
  "medical",
  "management",
];

const INSTITUTIONS = [
  "UIC",
  "UIUC",
  "NIU",
  "NEIU",
  "ISU",
  "SIUC",
  "SIUE",
  "EIU",
  "WIU",
  "GSU",
  "CSU",
];

interface NoticeRow {
  href: string;
  title: string;
  institution: string;
  procId: string;
}

async function loadAdvancedSearchForm(jar: Map<string, string>) {
  const res = await sledFetch(`${BASE}/search.cfm?mName=findAdvancedSearch`, { cookieJar: jar });
  if (!res.ok) throw new Error(`Illinois Higher Ed Bulletin HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  return {
    pubTok: $('input[name="pubTok"]').attr("value") ?? "",
    html,
  };
}

function parseNoticeLinks(html: string): NoticeRow[] {
  const $ = cheerio.load(html);
  const rows: NoticeRow[] = [];

  $("a[href*='viewNotice.cfm']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const title = $(el).text().trim();
    if (!title) return;

    const params = new URL(href, BASE).searchParams;
    rows.push({
      href,
      title,
      institution: params.get("i") ?? "IL Higher Ed",
      procId: params.get("p") ?? href,
    });
  });

  return rows;
}

async function searchKeyword(
  jar: Map<string, string>,
  pubTok: string,
  keyword: string,
): Promise<NoticeRow[]> {
  const body = new URLSearchParams();
  body.set("mName", "processAdvancedSearch");
  body.set("pubTok", pubTok);
  body.set("searchTerm", keyword);
  body.append("noticeSearchStatus", "Published");
  body.append("noticeType", "RFP");
  body.append("noticeType", "RFI");
  body.append("noticeType", "Bid");
  for (const inst of INSTITUTIONS) body.append("procuringInstitution", inst);
  body.set("submit", "Search");

  const res = await sledFetch(`${BASE}/search.cfm`, {
    method: "POST",
    cookieJar: jar,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: `${BASE}/search.cfm?mName=findAdvancedSearch`,
    },
    body: body.toString(),
  });

  if (!res.ok) return [];
  return parseNoticeLinks(await res.text());
}

function normalizeNotice(row: NoticeRow): Opportunity {
  const now = new Date().toISOString();
  const detailUrl = row.href.startsWith("http") ? row.href : `${BASE}/${row.href.replace(/^\//, "")}`;

  return {
    id: sledOpportunityId("stateuniv_il", `${row.institution}-${row.procId}`),
    source: "stateuniv_il",
    external_id: `${row.institution}-${row.procId}`,
    notice_type: /rfi/i.test(row.title)
      ? "sources_sought"
      : /rfp|proposal/i.test(row.title)
        ? "solicitation"
        : "solicitation",
    title: row.title,
    description: `${row.title}\n\nInstitution: ${row.institution}\nProcurement ID: ${row.procId}`,
    agency_id: null,
    agency_name: `${row.institution} — Illinois Higher Ed Bulletin`,
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: { state: "IL", country: "US" },
    estimated_value_usd: null,
    response_deadline: null,
    posted_date: null,
    updated_at: now,
    status: "active",
    sam_url: null,
    source_url: detailUrl,
    raw_data: {
      market_tier: "education",
      institution: row.institution,
      proc_id: row.procId,
    },
  };
}

export async function fetchStateUnivIllinoisOpportunities(
  options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const jar = new Map<string, string>();
  await warmCookieJar(`${BASE}/index.cfm`, jar);

  const { pubTok: _initialTok } = await loadAdvancedSearchForm(jar);
  void _initialTok;
  const keywords = options.keyword ? [options.keyword] : SEARCH_KEYWORDS;
  const seen = new Set<string>();
  const rows: NoticeRow[] = [];

  for (const keyword of keywords) {
    const { pubTok: freshTok } = await loadAdvancedSearchForm(jar);
    const found = await searchKeyword(jar, freshTok, keyword);
    for (const row of found) {
      const key = `${row.institution}:${row.procId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
    if (rows.length >= (options.limit ?? 80)) break;
  }

  const filtered = rows.filter((row) => {
    if (!options.keyword) return matchesDfealSledKeywords(row.title);
    return true;
  });

  const opportunities = filtered
    .slice(0, options.limit ?? 80)
    .map(normalizeNotice);

  return {
    source: "stateuniv_il",
    fetched: rows.length,
    opportunities,
    message: `Illinois Higher Ed Bulletin: ${opportunities.length} published notices (${rows.length} raw matches)`,
  };
}

export const STATEUNIV_IL_CONNECTOR_META = {
  id: "stateuniv_il" as const,
  name: "Illinois Higher Ed Bulletin",
  marketTier: "education" as const,
  phase: 3 as const,
  status: "live" as const,
  description: "Illinois public university procurement bulletin (UIC, UIUC, NIU, etc.)",
};
