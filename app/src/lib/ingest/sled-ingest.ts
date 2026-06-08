import { upsertOpportunities, updateIngestCursor } from "@/lib/db/opportunities";
import { getSledConnector, SLED_CONNECTORS } from "@/lib/sled/registry";
import type { SledSource } from "@/lib/sled/types";
import type { Opportunity } from "@/shared/types/opportunity";

export interface SledIngestResult {
  sources: Record<
    string,
    { fetched: number; upserted: number; message?: string; error?: string }
  >;
  total_fetched: number;
  total_upserted: number;
}

async function ingestOneSource(source: SledSource, daysBack = 30): Promise<{
  fetched: number;
  upserted: number;
  message?: string;
}> {
  const connector = getSledConnector(source);
  if (!connector) throw new Error(`Unknown SLED source: ${source}`);

  await updateIngestCursor(source, { last_status: "running", last_error: null });

  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const result = await connector.fetch({ since, limit: 150 });
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

export async function ingestSledOpportunities(options?: {
  sources?: SledSource[];
  daysBack?: number;
}): Promise<SledIngestResult> {
  const sources = options?.sources ?? (["bidbuy_il", "georgia"] as SledSource[]);
  const daysBack = options?.daysBack ?? 30;
  const out: SledIngestResult = {
    sources: {},
    total_fetched: 0,
    total_upserted: 0,
  };

  for (const source of sources) {
    try {
      const row = await ingestOneSource(source, daysBack);
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

export async function ingestAllEnabledSled(daysBack = 30): Promise<SledIngestResult> {
  if (process.env.SLED_INGEST_ENABLED?.trim() === "0") {
    return { sources: {}, total_fetched: 0, total_upserted: 0 };
  }

  const enabled = SLED_CONNECTORS.filter((c) => c.meta.status === "live").map(
    (c) => c.meta.id,
  );
  return ingestSledOpportunities({ sources: enabled, daysBack });
}

export function mergeSledOpportunities(batches: Opportunity[][]): Opportunity[] {
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
