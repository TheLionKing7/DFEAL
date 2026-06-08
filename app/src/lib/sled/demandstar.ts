import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";

/** DemandStar aggregator — credentials required for API/scrape access. */
export async function fetchDemandStarOpportunities(
  _options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const configured = Boolean(
    process.env.DEMANDSTAR_USERNAME?.trim() && process.env.DEMANDSTAR_PASSWORD?.trim(),
  );

  return {
    source: "demandstar",
    fetched: 0,
    opportunities: [],
    message: configured
      ? "DemandStar credentials set — connector implementation in progress."
      : "Set DEMANDSTAR_USERNAME and DEMANDSTAR_PASSWORD to enable state/local/education lanes.",
  };
}

export const DEMANDSTAR_CONNECTOR_META = {
  id: "demandstar" as const,
  name: "DemandStar",
  marketTier: "state" as const,
  phase: 3 as const,
  status: "credentials_required" as const,
  description: "State, local, and education aggregator",
};
