import {
  createDigestRun,
  finishDigestRun,
  getOpportunityById,
  insertOpportunityScores,
  listUnscoredOpportunityIds,
} from "@/lib/db/opportunities";
import { sendDailyDigestEmail } from "@/lib/email/daily-digest";
import { ingestSamOpportunities } from "@/lib/ingest/sam-ingest";
import { isHotScore, scoreOpportunity } from "@/lib/scoring/score-opportunity";

export interface DailyPipelineResult {
  digest_id: string;
  ingest: { fetched: number; upserted: number };
  scored: number;
  hot_count: number;
  email: { sent: boolean; skipped_reason?: string; recipient?: string };
}

export async function runDailyPipeline(): Promise<DailyPipelineResult> {
  const digestId = await createDigestRun();

  try {
    const ingest = await ingestSamOpportunities(30);
    const unscoredIds = await listUnscoredOpportunityIds(200);
    const scores = [];
    let hotCount = 0;

    for (const id of unscoredIds) {
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
        ingested: ingest.upserted,
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

export async function runScoringOnly(limit = 200) {
  const digestId = await createDigestRun();
  const unscoredIds = await listUnscoredOpportunityIds(limit);
  const scores = [];
  let hotCount = 0;

  for (const id of unscoredIds) {
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
