export type OpportunityLaneId =
  | "federal"
  | "state"
  | "local"
  | "education"
  | "illinois"
  | "ohio"
  | "georgia"
  | "grants";

export type MarketTier = "federal" | "state" | "local" | "education";

export interface OpportunityLane {
  id: OpportunityLaneId;
  label: string;
  href: string;
  description: string;
  source: "sam" | "demandstar" | "bidbuy_il" | "bonfire" | "ohio" | "georgia" | "grants_gov";
  marketTier: MarketTier;
  phase: 1 | 2 | 3;
}

export const OPPORTUNITY_LANES: OpportunityLane[] = [
  {
    id: "federal",
    label: "Federal (SAM)",
    href: "/opportunities?lane=federal",
    description: "Active solicitations from SAM.gov",
    source: "sam",
    marketTier: "federal",
    phase: 1,
  },
  {
    id: "illinois",
    label: "Illinois (home)",
    href: "/opportunities?lane=illinois",
    description: "BidBuy Illinois — DFEAL home state priority",
    source: "bidbuy_il",
    marketTier: "state",
    phase: 3,
  },
  {
    id: "state",
    label: "State",
    href: "/opportunities?lane=state",
    description: "State procurement (Phase 3)",
    source: "demandstar",
    marketTier: "state",
    phase: 3,
  },
  {
    id: "local",
    label: "Local",
    href: "/opportunities?lane=local",
    description: "Municipal portals (Phase 3)",
    source: "bonfire",
    marketTier: "local",
    phase: 3,
  },
  {
    id: "education",
    label: "Education",
    href: "/opportunities?lane=education",
    description: "K-12 and higher-ed — Illinois BidBuy, Higher Ed Bulletin, Bonfire",
    source: "demandstar",
    marketTier: "education",
    phase: 3,
  },
  {
    id: "ohio",
    label: "Ohio",
    href: "/opportunities?lane=ohio",
    description: "OhioBuys listings (Phase 3)",
    source: "ohio",
    marketTier: "state",
    phase: 3,
  },
  {
    id: "georgia",
    label: "Georgia",
    href: "/opportunities?lane=georgia",
    description: "Georgia procurement (Phase 3)",
    source: "georgia",
    marketTier: "state",
    phase: 3,
  },
  {
    id: "grants",
    label: "Grants",
    href: "/opportunities?lane=grants",
    description: "Federal grants via Grants.gov and SBA.gov programs",
    source: "grants_gov",
    marketTier: "federal",
    phase: 2,
  },
];

export function laneToSource(lane: OpportunityLaneId): OpportunityLane["source"] {
  return OPPORTUNITY_LANES.find((l) => l.id === lane)?.source ?? "sam";
}

export function laneToMarketTier(lane: OpportunityLaneId): MarketTier {
  return OPPORTUNITY_LANES.find((l) => l.id === lane)?.marketTier ?? "federal";
}

export const PURSUIT_STAGES = [
  { id: "tracking", label: "Tracking" },
  { id: "qualifying", label: "Qualifying" },
  { id: "bid_decision", label: "Bid decision" },
  { id: "proposal", label: "Proposal" },
  { id: "submitted", label: "Submitted" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export type PursuitStage = (typeof PURSUIT_STAGES)[number]["id"];

/** @deprecated Import from @/shared/document-types */
export { DOCUMENT_TYPES, type DocumentType } from "@/shared/document-types";
