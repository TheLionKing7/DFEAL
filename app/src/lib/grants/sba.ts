import * as cheerio from "cheerio";
import {
  baseGrantOpportunity,
  grantOpportunityId,
} from "@/lib/grants/normalize";
import { sledFetch } from "@/lib/sled/http";
import type { FederalGrantFetchOptions, FederalGrantFetchResult } from "@/lib/grants/types";

const SBA_BASE = "https://www.sba.gov";

/** Curated SBA grant / funding program pages relevant to small business capture */
const SBA_GRANT_PROGRAMS = [
  {
    id: "sbir",
    title: "Small Business Innovation Research (SBIR)",
    url: `${SBA_BASE}/funding-programs/grants/sbir-program`,
    description:
      "Federal SBIR program — scientific research and development grants for small businesses.",
  },
  {
    id: "sttr",
    title: "Small Business Technology Transfer (STTR)",
    url: `${SBA_BASE}/funding-programs/grants/sttr-program`,
    description:
      "Federal STTR program — R&D grants requiring small business + research institution partnership.",
  },
  {
    id: "step",
    title: "State Trade Expansion Program (STEP)",
    url: `${SBA_BASE}/funding-programs/grants/step`,
    description: "Export expansion grants administered through state and territory governments.",
  },
  {
    id: "manufacturing",
    title: "Made in America Manufacturing Grants",
    url: `${SBA_BASE}/funding-programs/grants/manufacturing-grants`,
    description: "SBA grants supporting small manufacturers and workforce development.",
  },
  {
    id: "community-navigator",
    title: "Community Navigator Pilot Program",
    url: `${SBA_BASE}/funding-programs/grants/community-navigator-pilot-program`,
    description: "Grants to organizations promoting entrepreneurship in underserved communities.",
  },
];

function parseSbaEventDate(text: string): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeSbaGrantProgram(program: (typeof SBA_GRANT_PROGRAMS)[number]) {
  return baseGrantOpportunity({
    id: grantOpportunityId("sba", program.id),
    source: "sba",
    external_id: program.id,
    title: program.title,
    description: program.description,
    agency_name: "U.S. Small Business Administration",
    response_deadline: null,
    posted_date: null,
    source_url: program.url,
    notice_type: "other",
    raw_data: {
      lane: "grants",
      funding_type: "sba_grant_program",
      program_id: program.id,
    },
  });
}

async function fetchSbaEvents(limit: number, district?: string) {
  const events: ReturnType<typeof baseGrantOpportunity>[] = [];
  const seen = new Set<string>();
  const maxPages = 5;

  for (let page = 0; page < maxPages && events.length < limit; page++) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (district) {
      params.set("f[0]", `field_district_office:${district}`);
    }

    const url = `${SBA_BASE}/events/find?${params.toString()}`;
    const res = await sledFetch(url);
    if (!res.ok) break;

    const html = await res.text();
    const $ = cheerio.load(html);

    $("h3 a[href^='/event/']").each((_, el) => {
      if (events.length >= limit) return;
      const href = $(el).attr("href") ?? "";
      const eventId = href.replace("/event/", "").trim();
      if (!eventId || seen.has(eventId)) return;
      seen.add(eventId);

      const title = $(el).text().trim();
      const container = $(el).closest("article, .views-row, li, div").first();
      const containerText = container.text().replace(/\s+/g, " ");
      const dateMatch = containerText.match(
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}[^]*?(?:AM|PM|EDT|EST|CDT|CST|PST)/i,
      );
      const eventDate = dateMatch ? parseSbaEventDate(dateMatch[0]) : null;
      const eventType = containerText.includes("SBA event")
        ? "SBA event"
        : containerText.includes("SBA participating")
          ? "SBA participating event"
          : "Resource partner event";

      events.push(
        baseGrantOpportunity({
          id: grantOpportunityId("sba", `event-${eventId}`),
          source: "sba",
          external_id: `event-${eventId}`,
          title,
          description: `${eventType}. ${dateMatch?.[0] ?? ""}`.trim(),
          agency_name: "U.S. Small Business Administration",
          response_deadline: eventDate,
          posted_date: eventDate,
          source_url: `${SBA_BASE}/event/${eventId}`,
          notice_type: "special_notice",
          raw_data: {
            lane: "grants",
            funding_type: "sba_event",
            event_id: eventId,
            event_type: eventType,
          },
        }),
      );
    });

    if ($("h3 a[href^='/event/']").length === 0) break;
  }

  return events;
}

export async function fetchSbaOpportunities(
  options: FederalGrantFetchOptions = {},
): Promise<FederalGrantFetchResult> {
  const limit = options.limit ?? 80;
  const district = process.env.SBA_DISTRICT_OFFICE?.trim();
  const grantPrograms = SBA_GRANT_PROGRAMS.map(normalizeSbaGrantProgram);
  const eventLimit = Math.max(20, limit - grantPrograms.length);
  const events = await fetchSbaEvents(eventLimit, district);

  const opportunities = [...grantPrograms, ...events].slice(0, limit);

  return {
    source: "sba",
    fetched: opportunities.length,
    opportunities,
    message: `SBA.gov: ${grantPrograms.length} grant programs + ${events.length} events${district ? ` (district filter: ${district})` : ""}`,
  };
}

export const SBA_CONNECTOR_META = {
  id: "sba" as const,
  name: "SBA.gov",
  marketTier: "federal" as const,
  phase: 2 as const,
  status: "live" as const,
  description: "SBA grant programs and contracting/business development events",
};
