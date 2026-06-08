import { createSamGovClient } from "@/lib/sam-gov/client";
import { normalizeSamOpportunity } from "@/lib/sam-gov/normalize";
import { upsertOpportunities, updateIngestCursor } from "@/lib/db/opportunities";
import { getDfealNaicsCodes } from "@/config/dfeal-profile";
import type { Opportunity } from "@/shared/types/opportunity";

export interface SamIngestResult {
  fetched: number;
  upserted: number;
  naics_codes: string[];
}

export async function ingestSamOpportunities(
  daysBack = 30,
): Promise<SamIngestResult> {
  await updateIngestCursor("sam", {
    last_status: "running",
    last_error: null,
  });

  try {
    const client = createSamGovClient();
    const naicsCodes = getDfealNaicsCodes();
    const seenNoticeIds = new Set<string>();
    const seenSourceUrls = new Set<string>();
    const merged: Opportunity[] = [];

    const postedTo = new Date();
    const postedFrom = new Date();
    postedFrom.setDate(postedFrom.getDate() - daysBack);
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

    for (const ncode of naicsCodes) {
      const { rows } = await client.searchOpportunities({
        ncode,
        limit: 100,
        postedFrom: fmt(postedFrom),
        postedTo: fmt(postedTo),
      });

      for (const raw of rows) {
        if (seenNoticeIds.has(raw.noticeId)) continue;
        const sourceUrl = raw.uiLink?.trim();
        if (sourceUrl && seenSourceUrls.has(sourceUrl)) continue;
        seenNoticeIds.add(raw.noticeId);
        if (sourceUrl) seenSourceUrls.add(sourceUrl);
        merged.push(normalizeSamOpportunity(raw));
      }
    }

    const upserted = await upsertOpportunities(merged);

    await updateIngestCursor("sam", {
      last_status: "success",
      rows_ingested: upserted,
      last_sync_at: new Date().toISOString(),
      last_error: null,
    });

    return {
      fetched: merged.length,
      upserted,
      naics_codes: naicsCodes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SAM ingest failed";
    await updateIngestCursor("sam", {
      last_status: "failed",
      last_error: message,
    });
    throw error;
  }
}
