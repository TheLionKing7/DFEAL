import type { Opportunity } from "@/shared/types/opportunity";

export type SledSource =
  | "ohio"
  | "georgia"
  | "demandstar"
  | "bidbuy_il"
  | "bonfire";

export interface SledConnectorMeta {
  id: SledSource;
  name: string;
  marketTier: "state" | "local" | "education";
  phase: 3;
  status: "live" | "credentials_required" | "stub";
  description: string;
}

export interface SledFetchOptions {
  since?: Date;
  keyword?: string;
  limit?: number;
}

export interface SledFetchResult {
  source: SledSource;
  fetched: number;
  opportunities: Opportunity[];
  message?: string;
}

export interface SledConnector {
  meta: SledConnectorMeta;
  fetch: (options?: SledFetchOptions) => Promise<SledFetchResult>;
}
