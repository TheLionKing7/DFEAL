import type { Opportunity } from "@/shared/types/opportunity";

export type FederalGrantSource = "grants_gov" | "sba";

export interface FederalGrantConnectorMeta {
  id: FederalGrantSource;
  name: string;
  marketTier: "federal";
  phase: 1 | 2;
  status: "live" | "stub";
  description: string;
}

export interface FederalGrantFetchOptions {
  since?: Date;
  keyword?: string;
  limit?: number;
}

export interface FederalGrantFetchResult {
  source: FederalGrantSource;
  fetched: number;
  opportunities: Opportunity[];
  message?: string;
}

export interface FederalGrantConnector {
  meta: FederalGrantConnectorMeta;
  fetch: (options?: FederalGrantFetchOptions) => Promise<FederalGrantFetchResult>;
}
