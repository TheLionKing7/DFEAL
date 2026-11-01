import { listFirms } from "@/lib/firms/repository";
import type { FirmProfile } from "@/lib/firms/types";

/**
 * Opportunities are ingested once for the whole platform, then scored per firm.
 * The ingest profile is the union of every active firm's NAICS codes and
 * keywords, so each source is queried once regardless of how many firms exist.
 */
export interface IngestProfile {
  naicsCodes: string[];
  keywords: string[];
  firms: FirmProfile[];
}

/** Hard cap so a large tenant base cannot blow through SAM.gov rate limits in one run. */
const MAX_SAM_NAICS_QUERIES = Number(process.env.SAM_MAX_NAICS_QUERIES ?? 60);

export function buildIngestProfile(firms: FirmProfile[]): IngestProfile {
  const naicsCount = new Map<string, number>();
  const keywords = new Set<string>();
  for (const firm of firms) {
    for (const code of firm.naicsCodes) naicsCount.set(code, (naicsCount.get(code) ?? 0) + 1);
    for (const kw of firm.keywords) keywords.add(kw.toLowerCase());
  }
  // Primary NAICS first, then the codes shared by the most firms.
  const primaries = new Set(firms.map((f) => f.primaryNaics));
  const naicsCodes = [...naicsCount.entries()]
    .sort((a, b) => Number(primaries.has(b[0])) - Number(primaries.has(a[0])) || b[1] - a[1])
    .map(([code]) => code)
    .slice(0, MAX_SAM_NAICS_QUERIES);
  return { naicsCodes, keywords: [...keywords], firms };
}

export async function loadIngestProfile(): Promise<IngestProfile> {
  return buildIngestProfile(await listFirms({ activeOnly: true }));
}
