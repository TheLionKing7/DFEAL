export type OpportunityLaneId =
  | 'federal'
  | 'state'
  | 'local'
  | 'education'
  | 'ohio'
  | 'georgia'
  | 'grants';

export type MarketTier = 'federal' | 'state' | 'local' | 'education';

export interface OpportunityLane {
  id: OpportunityLaneId;
  label: string;
  href: string;
  description: string;
  source: 'sam' | 'demandstar' | 'bidbuy_il' | 'bonfire' | 'ohio' | 'georgia' | 'grants_gov';
  marketTier: MarketTier;
  phase: 1 | 2 | 3;
}

/** Explore / opportunities filter lanes — DFEAL SLED + federal scope */
export const OPPORTUNITY_LANES: OpportunityLane[] = [
  {
    id: 'federal',
    label: 'Federal (SAM)',
    href: '/opportunities?lane=federal',
    description: 'Active solicitations and presolicitations from SAM.gov',
    source: 'sam',
    marketTier: 'federal',
    phase: 1,
  },
  {
    id: 'state',
    label: 'State',
    href: '/opportunities?lane=state',
    description: 'State-level procurement (DemandStar, BidBuy, etc.)',
    source: 'demandstar',
    marketTier: 'state',
    phase: 3,
  },
  {
    id: 'local',
    label: 'Local',
    href: '/opportunities?lane=local',
    description: 'Municipal and regional portals (Bonfire, city/county)',
    source: 'bonfire',
    marketTier: 'local',
    phase: 3,
  },
  {
    id: 'education',
    label: 'Education',
    href: '/opportunities?lane=education',
    description: 'K-12 and higher-ed cooperative purchasing',
    source: 'demandstar',
    marketTier: 'education',
    phase: 3,
  },
  {
    id: 'ohio',
    label: 'Ohio',
    href: '/opportunities?lane=ohio',
    description: 'OhioBuys and state cooperative listings',
    source: 'ohio',
    marketTier: 'state',
    phase: 3,
  },
  {
    id: 'georgia',
    label: 'Georgia',
    href: '/opportunities?lane=georgia',
    description: 'Georgia Procurement Registry / Team Georgia',
    source: 'georgia',
    marketTier: 'state',
    phase: 3,
  },
  {
    id: 'grants',
    label: 'Grants',
    href: '/opportunities?lane=grants',
    description: 'Federal grant opportunities',
    source: 'grants_gov',
    marketTier: 'federal',
    phase: 2,
  },
];

export function laneToSource(lane: OpportunityLaneId): OpportunityLane['source'] {
  return OPPORTUNITY_LANES.find((l) => l.id === lane)?.source ?? 'sam';
}

export function laneToMarketTier(lane: OpportunityLaneId): MarketTier {
  return OPPORTUNITY_LANES.find((l) => l.id === lane)?.marketTier ?? 'federal';
}
