import {
  createDigestRun,
  finishDigestRun,
  getOpportunityById,
  insertOpportunityScores,
  listActiveOpportunityIds,
  listUnscoredOpportunityIds,
} from "@/lib/db/opportunities";
import { sendDailyDigestEmail } from "@/lib/email/daily-digest";
import { ingestSamOpportunities } from "@/lib/ingest/sam-ingest";
import { ingestAllEnabledSled } from "@/lib/ingest/sled-ingest";
import { isHotScore, scoreOpportunity } from "@/lib/scoring/score-opportunity";

export interface DailyPipelineResult {
  digest_id: string;
  ingest: { fetched: number; upserted: number };
  sled_ingest?: {
    total_fetched: number;
    total_upserted: number;
    sources: Record<string, unknown>;
  };
  scored: number;
  hot_count: number;
  email: { sent: boolean; skipped_reason?: string; recipient?: string };
}

export async function runDailyPipeline(): Promise<DailyPipelineResult> {
  const digestId = await createDigestRun();

  try {
    const ingest = await ingestSamOpportunities(30);
    let sledIngest: Awaited<ReturnType<typeof ingestAllEnabledSled>> | undefined;
    try {
      sledIngest = await ingestAllEnabledSled(30);
    } catch {
      sledIngest = { sources: {}, total_fetched: 0, total_upserted: 0 };
    }
    const activeIds = await listActiveOpportunityIds(200);
    const scores = [];
    let hotCount = 0;

    for (const id of activeIds) {
      const opp = await getOpportunityById(id);
      if (!opp) continue;
      const result = scoreOpportunity(opp);
      if (isHotScore(result)) hotCount += 1;
      scores.push({
        opportunity_id: id,
        fit_score: result.fit_score,
        go_no_go: result.go_no_go,
        rationale: result.rationale,
        digest_batch_id: digestId,
      });
    }

    await insertOpportunityScores(scores);

    let emailResult: Awaited<ReturnType<typeof sendDailyDigestEmail>> = {
      sent: false,
      skipped_reason: "not attempted",
    };

    try {
      emailResult = await sendDailyDigestEmail({
        hotCount,
        scored: scores.length,
        ingested: ingest.upserted + (sledIngest?.total_upserted ?? 0),
      });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : "Email send failed";
      emailResult = { sent: false, skipped_reason: message };
    }

    await finishDigestRun(digestId, {
      status: "success",
      opportunities_scored: scores.length,
      hot_count: hotCount,
      email_sent: emailResult.sent,
    });

    return {
      digest_id: digestId,
      ingest,
      sled_ingest: sledIngest
        ? {
            total_fetched: sledIngest.total_fetched,
            total_upserted: sledIngest.total_upserted,
            sources: sledIngest.sources,
          }
        : undefined,
      scored: scores.length,
      hot_count: hotCount,
      email: {
        sent: emailResult.sent,
        skipped_reason: emailResult.skipped_reason,
        recipient: emailResult.recipient,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Daily pipeline failed";
    await finishDigestRun(digestId, {
      status: "failed",
      opportunities_scored: 0,
      hot_count: 0,
      error_message: message,
    });
    throw error;
  }
}

export async function runScoringOnly(limit = 200, rescoreAll = true) {
  const digestId = await createDigestRun();
  const ids = rescoreAll
    ? await listActiveOpportunityIds(limit)
    : await listUnscoredOpportunityIds(limit);
  const scores = [];
  let hotCount = 0;

  for (const id of ids) {
    const opp = await getOpportunityById(id);
    if (!opp) continue;
    const result = scoreOpportunity(opp);
    if (isHotScore(result)) hotCount += 1;
    scores.push({
      opportunity_id: id,
      fit_score: result.fit_score,
      go_no_go: result.go_no_go,
      rationale: result.rationale,
      digest_batch_id: digestId,
    });
  }

  await insertOpportunityScores(scores);
  await finishDigestRun(digestId, {
    status: "success",
    opportunities_scored: scores.length,
    hot_count: hotCount,
  });

  return { digest_id: digestId, scored: scores.length, hot_count: hotCount };
}
