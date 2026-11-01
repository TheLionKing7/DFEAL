import { archiveStaleOpportunities } from "@/lib/db/archive";
import {
  createDigestRun,
  finishDigestRun,
  getOpportunitiesByIds,
  listActiveOpportunityIds,
  upsertOpportunityScores,
} from "@/lib/db/opportunities";
import { sendDailyDigestEmail, type SendDailyDigestResult } from "@/lib/email/daily-digest";
import { loadIngestProfile } from "@/lib/firms/ingest-profile";
import { listFirms } from "@/lib/firms/repository";
import type { FirmProfile } from "@/lib/firms/types";
import { ingestAllEnabledGrants } from "@/lib/ingest/grants-ingest";
import { ingestSamOpportunities } from "@/lib/ingest/sam-ingest";
import { ingestAllEnabledSled } from "@/lib/ingest/sled-ingest";
import { logger } from "@/lib/logger";
import { isHotScore, scoreOpportunity } from "@/lib/scoring/score-opportunity";
import type { Opportunity } from "@/shared/types/opportunity";

/** Max active opportunities scored per firm per run. */
const SCORE_LIMIT = Number(process.env.SCORE_LIMIT ?? 1000);

export interface FirmScoringResult {
  firm_id: string;
  firm: string;
  scored: number;
  hot_count: number;
  email?: SendDailyDigestResult;
  error?: string;
}

export interface DailyPipelineResult {
  digest_id: string;
  firms: number;
  ingest: { fetched: number; upserted: number; naics_codes: string[] };
  sam_error?: string;
  archived: number;
  sled_ingest?: { total_fetched: number; total_upserted: number; sources: Record<string, unknown> };
  grants_ingest?: { total_fetched: number; total_upserted: number; sources: Record<string, unknown> };
  scoring: FirmScoringResult[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Score a batch of opportunities for one firm and persist the current scores. */
export async function scoreForFirm(
  firm: FirmProfile,
  opportunities: Opportunity[],
  digestId?: string,
): Promise<{ scored: number; hot_count: number }> {
  let hotCount = 0;
  const scores = opportunities.map((opp) => {
    const result = scoreOpportunity(opp, firm);
    if (isHotScore(result)) hotCount += 1;
    return {
      opportunity_id: opp.id,
      fit_score: result.fit_score,
      go_no_go: result.go_no_go,
      rationale: result.rationale,
      digest_batch_id: digestId,
    };
  });
  await upsertOpportunityScores(firm.id, scores);
  return { scored: scores.length, hot_count: hotCount };
}

async function loadActiveOpportunities(limit = SCORE_LIMIT) {
  const ids = await listActiveOpportunityIds(limit);
  return getOpportunitiesByIds(ids);
}

export async function runDailyPipeline(options?: { sendEmail?: boolean }): Promise<DailyPipelineResult> {
  const sendEmail = options?.sendEmail ?? true;
  const digestId = await createDigestRun("daily_pipeline");

  try {
    const profile = await loadIngestProfile();
    if (profile.firms.length === 0) {
      logger.warn("daily_pipeline.no_firms", {});
    }

    // Ingest each source independently — one upstream outage must not abort the run.
    let ingest: DailyPipelineResult["ingest"] = { fetched: 0, upserted: 0, naics_codes: [] };
    let samError: string | undefined;
    try {
      ingest = await ingestSamOpportunities(30, profile.naicsCodes);
    } catch (error) {
      samError = errorMessage(error, "SAM ingest failed");
      logger.error("daily_pipeline.sam_failed", { error: samError });
    }

    const sledIngest = await ingestAllEnabledSled(30, profile.keywords).catch((error) => {
      logger.error("daily_pipeline.sled_failed", { error: errorMessage(error, "SLED failed") });
      return { sources: {}, total_fetched: 0, total_upserted: 0 };
    });
    const grantsIngest = await ingestAllEnabledGrants(120, profile.keywords).catch((error) => {
      logger.error("daily_pipeline.grants_failed", { error: errorMessage(error, "Grants failed") });
      return { sources: {}, total_fetched: 0, total_upserted: 0 };
    });

    const { archivedCount } = await archiveStaleOpportunities();

    const opportunities = await loadActiveOpportunities();
    const ingested =
      ingest.upserted + sledIngest.total_upserted + grantsIngest.total_upserted;

    const scoring: FirmScoringResult[] = [];
    for (const firm of profile.firms) {
      const row: FirmScoringResult = { firm_id: firm.id, firm: firm.slug, scored: 0, hot_count: 0 };
      try {
        Object.assign(row, await scoreForFirm(firm, opportunities, digestId));
        if (sendEmail) {
          row.email = await sendDailyDigestEmail(firm, {
            hotCount: row.hot_count,
            scored: row.scored,
            ingested,
          }).catch((error) => ({ sent: false, skipped_reason: errorMessage(error, "Email failed") }));
        }
      } catch (error) {
        row.error = errorMessage(error, "Scoring failed");
        logger.error("daily_pipeline.firm_failed", { firm: firm.slug, error: row.error });
      }
      scoring.push(row);
    }

    await finishDigestRun(digestId, {
      status: "success",
      opportunities_scored: scoring.reduce((n, r) => n + r.scored, 0),
      hot_count: scoring.reduce((n, r) => n + r.hot_count, 0),
      email_sent: scoring.some((r) => r.email?.sent),
      error_message: samError ?? null,
    });

    return {
      digest_id: digestId,
      firms: profile.firms.length,
      ingest,
      sam_error: samError,
      archived: archivedCount,
      sled_ingest: sledIngest,
      grants_ingest: grantsIngest,
      scoring,
    };
  } catch (error) {
    const message = errorMessage(error, "Daily pipeline failed");
    await finishDigestRun(digestId, {
      status: "failed",
      opportunities_scored: 0,
      hot_count: 0,
      error_message: message,
    });
    throw error;
  }
}

/** Re-score without ingesting — all active firms, or one firm (e.g. right after onboarding). */
export async function runScoringOnly(options?: { firmId?: string; limit?: number }) {
  const firms = (await listFirms({ activeOnly: true })).filter(
    (f) => !options?.firmId || f.id === options.firmId,
  );
  const opportunities = await loadActiveOpportunities(options?.limit ?? SCORE_LIMIT);
  const results: FirmScoringResult[] = [];
  for (const firm of firms) {
    const digestId = await createDigestRun("rescore", firm.id);
    const r = await scoreForFirm(firm, opportunities, digestId);
    await finishDigestRun(digestId, {
      status: "success",
      opportunities_scored: r.scored,
      hot_count: r.hot_count,
    });
    results.push({ firm_id: firm.id, firm: firm.slug, ...r });
  }
  return results;
}
