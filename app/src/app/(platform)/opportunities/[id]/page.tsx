import { notFound } from "next/navigation";
import { OpportunityWorkspace } from "@/components/opportunity/OpportunityWorkspace";
import { listAnalysisRuns, getLatestScore } from "@/lib/db/analysis";
import { listComplianceRuns } from "@/lib/db/compliance";
import { listDocuments } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { getPursuit } from "@/lib/db/pursuits";
import { getSessionUser } from "@/lib/supabase/server";
import type { PursuitStage } from "@/shared/opportunity-lanes";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const opp = await getOpportunityById(id);
  if (!opp) notFound();

  const [score, analyses, documents, complianceRuns, pursuit] = await Promise.all([
    getLatestScore(id),
    listAnalysisRuns(id, 3),
    listDocuments({ opportunityId: id, limit: 20 }),
    listComplianceRuns(id, 3),
    user?.email ? getPursuit(user.email, id) : Promise.resolve(null),
  ]);

  const overviewRun = analyses.find(
    (run) => (run.result_json as Record<string, unknown>)?.kind === "overview_summary",
  );
  const overviewSummary = overviewRun
    ? {
        executive_summary: String(
          (overviewRun.result_json as Record<string, unknown>).executive_summary ?? "",
        ),
        scope_of_work: String(
          (overviewRun.result_json as Record<string, unknown>).scope_of_work ?? "",
        ),
        key_requirements: Array.isArray(
          (overviewRun.result_json as Record<string, unknown>).key_requirements,
        )
          ? ((overviewRun.result_json as Record<string, unknown>).key_requirements as unknown[]).map(
              String,
            )
          : [],
        important_dates: Array.isArray(
          (overviewRun.result_json as Record<string, unknown>).important_dates,
        )
          ? ((overviewRun.result_json as Record<string, unknown>).important_dates as unknown[]).map(
              String,
            )
          : [],
        dfeal_fit: String((overviewRun.result_json as Record<string, unknown>).dfeal_fit ?? ""),
        recommended_next_steps: Array.isArray(
          (overviewRun.result_json as Record<string, unknown>).recommended_next_steps,
        )
          ? (
              (overviewRun.result_json as Record<string, unknown>)
                .recommended_next_steps as unknown[]
            ).map(String)
          : [],
        provider: overviewRun.provider ?? "cached",
        cached: true,
      }
    : null;

  const mappedAnalyses = analyses
    .filter((run) => (run.result_json as Record<string, unknown>)?.kind !== "overview_summary")
    .map((run) => {
      const json = run.result_json ?? {};
      return {
        fit_score: run.fit_score ?? 0,
        go_no_go: run.go_no_go ?? "review",
        summary: String(json.summary ?? ""),
        strengths: Array.isArray(json.strengths) ? json.strengths.map(String) : [],
        risks: Array.isArray(json.risks) ? json.risks.map(String) : [],
        recommended_actions: Array.isArray(json.recommended_actions)
          ? json.recommended_actions.map(String)
          : [],
        teaming_notes: String(json.teaming_notes ?? ""),
        provider: run.provider ?? "unknown",
        created_at: run.created_at,
      };
    });

  const mappedCompliance = complianceRuns.map((run) => {
    const json = run.checklist_json ?? {};
    const items = Array.isArray(json.items) ? json.items : [];
    return {
      pass_count: run.pass_count,
      fail_count: run.fail_count,
      summary: String(json.summary ?? ""),
      items: items.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          section: String(row.section ?? ""),
          requirement: String(row.requirement ?? ""),
          status: String(row.status ?? "review"),
          notes: String(row.notes ?? ""),
        };
      }),
    };
  });

  return (
    <OpportunityWorkspace
      opportunity={opp}
      score={
        score
          ? {
              fit_score: score.fit_score,
              go_no_go: score.go_no_go,
              rationale: score.rationale,
            }
          : null
      }
      pursuit={
        pursuit
          ? {
              pursuit_stage: (pursuit.pursuit_stage ?? "tracking") as PursuitStage,
              notes: pursuit.notes,
            }
          : null
      }
      analyses={mappedAnalyses}
      overviewSummary={overviewSummary}
      documents={documents.map((d) => ({
        id: d.id,
        title: d.title,
        document_type: d.document_type,
        created_at: d.created_at,
      }))}
      complianceRuns={mappedCompliance}
    />
  );
}
