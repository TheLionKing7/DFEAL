import { upsertOpportunities, updateIngestCursor } from "@/lib/db/opportunities";
import {
  FEDERAL_GRANT_CONNECTORS,
} from "@/lib/grants/registry";
import type { FederalGrantSource } from "@/lib/grants/types";
import type { Opportunity } from "@/shared/types/opportunity";

export interface FederalGrantIngestResult {
  sources: Record<
    string,
    { fetched: number; upserted: number; message?: string; error?: string }
  >;
  total_fetched: number;
  total_upserted: number;
}

async function ingestOneGrantSource(source: FederalGrantSource, limit = 120) {
  const connector = FEDERAL_GRANT_CONNECTORS.find((c) => c.meta.id === source);
  if (!connector) throw new Error(`Unknown grant source: ${source}`);

  await updateIngestCursor(source, { last_status: "running", last_error: null });

  try {
    const result = await connector.fetch({ limit });
    const upserted = await upsertOpportunities(result.opportunities);

    await updateIngestCursor(source, {
      last_status: "success",
      rows_ingested: upserted,
      last_sync_at: new Date().toISOString(),
      last_error: result.message ?? null,
    });

    return {
      fetched: result.fetched,
      upserted,
      message: result.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${source} ingest failed`;
    await updateIngestCursor(source, {
      last_status: "failed",
      last_error: message,
    });
    throw error;
  }
}

export async function ingestFederalGrantOpportunities(options?: {
  sources?: FederalGrantSource[];
  limit?: number;
}): Promise<FederalGrantIngestResult> {
  const sources = options?.sources ?? (["grants_gov", "sba"] as FederalGrantSource[]);
  const out: FederalGrantIngestResult = {
    sources: {},
    total_fetched: 0,
    total_upserted: 0,
  };

  for (const source of sources) {
    try {
      const row = await ingestOneGrantSource(source, options?.limit ?? 120);
      out.sources[source] = row;
      out.total_fetched += row.fetched;
      out.total_upserted += row.upserted;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ingest failed";
      out.sources[source] = { fetched: 0, upserted: 0, error: message };
    }
  }

  return out;
}

export async function ingestAllEnabledGrants(limit = 120): Promise<FederalGrantIngestResult> {
  if (process.env.GRANTS_INGEST_ENABLED?.trim() === "0") {
    return { sources: {}, total_fetched: 0, total_upserted: 0 };
  }

  const enabled = FEDERAL_GRANT_CONNECTORS.filter((c) => c.meta.status === "live").map(
    (c) => c.meta.id,
  );
  return ingestFederalGrantOpportunities({ sources: enabled, limit });
}

export function mergeGrantOpportunities(batches: Opportunity[][]): Opportunity[] {
  const seen = new Set<string>();
  const merged: Opportunity[] = [];
  for (const batch of batches) {
    for (const opp of batch) {
      const key = `${opp.source}:${opp.external_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(opp);
    }
  }
  return merged;
}
