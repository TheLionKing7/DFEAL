import { fetchBidBuyIllinoisOpportunities, BIDBUY_IL_CONNECTOR_META } from "@/lib/sled/bidbuy-illinois";
import { fetchBonfireOpportunities, BONFIRE_CONNECTOR_META } from "@/lib/sled/bonfire";
import { fetchDemandStarOpportunities, DEMANDSTAR_CONNECTOR_META } from "@/lib/sled/demandstar";
import { fetchGeorgiaOpportunities, GEORGIA_CONNECTOR_META } from "@/lib/sled/georgia";
import {
  fetchIllinoisEducationOpportunities,
  EDUCATION_IL_CONNECTOR_META,
} from "@/lib/sled/illinois-education";
import { fetchOhioOpportunities, OHIO_CONNECTOR_META } from "@/lib/sled/ohio";
import {
  fetchStateUnivIllinoisOpportunities,
  STATEUNIV_IL_CONNECTOR_META,
} from "@/lib/sled/stateuniv-illinois";
import type { OpportunityLaneId } from "@/shared/opportunity-lanes";
import type { SledConnector, SledConnectorMeta, SledSource } from "@/lib/sled/types";

/** Illinois (home state) is listed first for ingest priority */
export const SLED_CONNECTORS: SledConnector[] = [
  { meta: BIDBUY_IL_CONNECTOR_META, fetch: fetchBidBuyIllinoisOpportunities },
  { meta: EDUCATION_IL_CONNECTOR_META, fetch: fetchIllinoisEducationOpportunities },
  { meta: STATEUNIV_IL_CONNECTOR_META, fetch: fetchStateUnivIllinoisOpportunities },
  { meta: BONFIRE_CONNECTOR_META, fetch: fetchBonfireOpportunities },
  { meta: GEORGIA_CONNECTOR_META, fetch: fetchGeorgiaOpportunities },
  { meta: OHIO_CONNECTOR_META, fetch: fetchOhioOpportunities },
  { meta: DEMANDSTAR_CONNECTOR_META, fetch: fetchDemandStarOpportunities },
];

export function getSledConnector(source: SledSource): SledConnector | undefined {
  return SLED_CONNECTORS.find((c) => c.meta.id === source);
}

export function laneToSledSources(lane: OpportunityLaneId): SledSource[] {
  switch (lane) {
    case "illinois":
      return ["bidbuy_il"];
    case "ohio":
      return ["ohio"];
    case "georgia":
      return ["georgia"];
    case "state":
      return ["bidbuy_il", "demandstar", "ohio"];
    case "local":
      return ["bonfire", "demandstar"];
    case "education":
      return ["education_il", "stateuniv_il", "bonfire"];
    default:
      return [];
  }
}

export function laneToGrantSources(lane: OpportunityLaneId): ("grants_gov" | "sba")[] {
  if (lane !== "grants") return [];
  return ["grants_gov", "sba"];
}

export function listConnectorStatus(): SledConnectorMeta[] {
  return SLED_CONNECTORS.map((c) => c.meta);
}
