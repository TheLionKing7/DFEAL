export type OpportunitySource =
  | "sam"
  | "ohio"
  | "georgia"
  | "grants_gov"
  | "sba"
  | "demandstar"
  | "bidbuy_il"
  | "bonfire"
  | "stateuniv_il"
  | "education_il";

export type MarketTier = "federal" | "state" | "local" | "education";

export type OpportunityStatus = "active" | "closed" | "awarded" | "cancelled" | "archived";

export type NoticeType =
  | "presolicitation"
  | "solicitation"
  | "sources_sought"
  | "award"
  | "special_notice"
  | "other";

export interface Opportunity {
  id: string;
  source: OpportunitySource;
  external_id: string;
  notice_type: NoticeType;
  title: string;
  description: string | null;
  agency_id: string | null;
  agency_name: string | null;
  naics: string | null;
  psc: string | null;
  set_aside: string | null;
  place_of_performance: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
  estimated_value_usd: number | null;
  response_deadline: string | null;
  posted_date: string | null;
  updated_at: string;
  status: OpportunityStatus;
  archived_at: string | null;
  sam_url: string | null;
  source_url: string | null;
  raw_data: Record<string, unknown> | null;
}

export interface OpportunityUpdate {
  id: string;
  opportunity_id: string;
  label: string;
  detail: string;
  posted_at: string;
}

export interface OpportunityContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  type: "primary" | "secondary" | "contracting_officer" | "other";
}
