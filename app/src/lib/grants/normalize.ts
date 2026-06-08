import type { Opportunity, OpportunitySource } from "@/shared/types/opportunity";

export function grantOpportunityId(source: OpportunitySource, externalId: string): string {
  return `${source}-${externalId.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

/** Grants.gov dates like "04/03/2026" */
export function parseGrantsGovDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const [, mm, dd, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function baseGrantOpportunity(
  partial: Pick<
    Opportunity,
    | "id"
    | "source"
    | "external_id"
    | "title"
    | "description"
    | "agency_name"
    | "response_deadline"
    | "posted_date"
    | "source_url"
    | "raw_data"
  > & {
    notice_type?: Opportunity["notice_type"];
  },
): Opportunity {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    source: partial.source,
    external_id: partial.external_id,
    notice_type: partial.notice_type ?? "other",
    title: partial.title,
    description: partial.description,
    agency_id: null,
    agency_name: partial.agency_name,
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: { country: "US" },
    estimated_value_usd: null,
    response_deadline: partial.response_deadline,
    posted_date: partial.posted_date,
    updated_at: now,
    status: "active",
    sam_url: null,
    source_url: partial.source_url,
    raw_data: partial.raw_data,
  };
}
