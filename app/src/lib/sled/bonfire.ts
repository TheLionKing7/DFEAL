import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";

export async function fetchBonfireOpportunities(
  _options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const portals = process.env.BONFIRE_PORTALS?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];

  return {
    source: "bonfire",
    fetched: 0,
    opportunities: [],
    message:
      portals.length > 0
        ? `Bonfire portals configured (${portals.length}) — RSS/HTML connector pending.`
        : "Set BONFIRE_PORTALS (comma-separated URLs) for municipal Bonfire hubs.",
  };
}

export const BONFIRE_CONNECTOR_META = {
  id: "bonfire" as const,
  name: "Bonfire",
  marketTier: "local" as const,
  phase: 3 as const,
  status: "stub" as const,
  description: "Municipal Bonfire procurement portals",
};
