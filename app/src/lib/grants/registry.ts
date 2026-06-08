import {
  fetchGrantsGovOpportunities,
  GRANTS_GOV_CONNECTOR_META,
} from "@/lib/grants/grants-gov";
import { fetchSbaOpportunities, SBA_CONNECTOR_META } from "@/lib/grants/sba";
import type {
  FederalGrantConnector,
  FederalGrantConnectorMeta,
  FederalGrantSource,
} from "@/lib/grants/types";

export const FEDERAL_GRANT_CONNECTORS: FederalGrantConnector[] = [
  { meta: GRANTS_GOV_CONNECTOR_META, fetch: fetchGrantsGovOpportunities },
  { meta: SBA_CONNECTOR_META, fetch: fetchSbaOpportunities },
];

export function getFederalGrantConnector(source: FederalGrantSource) {
  return FEDERAL_GRANT_CONNECTORS.find((c) => c.meta.id === source);
}

export function listFederalGrantConnectorStatus(): FederalGrantConnectorMeta[] {
  return FEDERAL_GRANT_CONNECTORS.map((c) => c.meta);
}
