import { createHash } from "crypto";
import type { Opportunity } from "@/shared/types/opportunity";
import type { DbOpportunity, HotOpportunity, Json } from "@/lib/db/database.types";

export function parseSamDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function opportunityContentHash(opp: {
  title: string;
  description: string | null;
  response_deadline: string | null;
  set_aside: string | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: opp.title,
        description: opp.description,
        response_deadline: opp.response_deadline,
        set_aside: opp.set_aside,
      }),
    )
    .digest("hex");
}

export function opportunityToDbRow(opp: Opportunity) {
  return {
    id: opp.id,
    source: opp.source,
    external_id: opp.external_id,
    market_tier: "federal" as const,
    notice_type: opp.notice_type,
    title: opp.title,
    description: opp.description,
    agency_id: opp.agency_id,
    agency_name: opp.agency_name,
    naics: opp.naics,
    psc: opp.psc,
    set_aside: opp.set_aside,
    place_of_performance: opp.place_of_performance as Json | null,
    estimated_value_usd: opp.estimated_value_usd,
    response_deadline: parseSamDate(opp.response_deadline),
    posted_date: parseSamDate(opp.posted_date),
    status: opp.status,
    sam_url: opp.sam_url,
    source_url: opp.source_url,
    raw_json: (opp.raw_data ?? {}) as Json,
    content_hash: opportunityContentHash(opp),
  };
}

export function dbRowToOpportunity(row: DbOpportunity | HotOpportunity): Opportunity {
  return {
    id: row.id,
    source: row.source as Opportunity["source"],
    external_id: row.external_id,
    notice_type: row.notice_type as Opportunity["notice_type"],
    title: row.title,
    description: row.description,
    agency_id: row.agency_id,
    agency_name: row.agency_name,
    naics: row.naics,
    psc: row.psc,
    set_aside: row.set_aside,
    place_of_performance: row.place_of_performance as Opportunity["place_of_performance"],
    estimated_value_usd: row.estimated_value_usd,
    response_deadline: row.response_deadline,
    posted_date: row.posted_date,
    updated_at: row.updated_at,
    status: row.status as Opportunity["status"],
    sam_url: row.sam_url,
    source_url: row.source_url,
    raw_data: row.raw_json as Record<string, unknown>,
  };
}

export function hotRowToDisplay(row: HotOpportunity) {
  return {
    ...dbRowToOpportunity(row),
    fit_score: row.fit_score,
    go_no_go: row.go_no_go,
    score_rationale: row.score_rationale,
    scored_at: row.scored_at,
  };
}
