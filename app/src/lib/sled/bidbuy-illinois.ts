import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";

export async function fetchBidBuyIllinoisOpportunities(
  _options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  return {
    source: "bidbuy_il",
    fetched: 0,
    opportunities: [],
    message:
      "BidBuy Illinois connector pending — Illinois Procurement Gateway HTML ingest planned for Phase 3b.",
  };
}

export const BIDBUY_IL_CONNECTOR_META = {
  id: "bidbuy_il" as const,
  name: "BidBuy Illinois",
  marketTier: "state" as const,
  phase: 3 as const,
  status: "stub" as const,
  description: "Illinois state procurement portal",
};
