import { NextRequest, NextResponse } from "next/server";
import { summarizeOpportunityOverview } from "@/lib/ai/summarize-opportunity";
import { listAnalysisRuns } from "@/lib/db/analysis";
import { getOpportunityById } from "@/lib/db/opportunities";
import { requireFirmApi } from "@/lib/firms/context";
import { notFound, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

export const maxDuration = 90;

export function parseCachedOverview(run: Awaited<ReturnType<typeof listAnalysisRuns>>[0]) {
  const json = run.result_json ?? {};
  if (json.kind !== "overview_summary") return null;
  return {
    executive_summary: String(json.executive_summary ?? ""),
    scope_of_work: String(json.scope_of_work ?? ""),
    key_requirements: Array.isArray(json.key_requirements) ? json.key_requirements.map(String) : [],
    important_dates: Array.isArray(json.important_dates) ? json.important_dates.map(String) : [],
    firm_fit: String(json.firm_fit ?? json.dfeal_fit ?? ""),
    recommended_next_steps: Array.isArray(json.recommended_next_steps)
      ? json.recommended_next_steps.map(String)
      : [],
    provider: run.provider ?? "cached",
    run_id: run.id,
    cached: true,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  try {
    const runs = await listAnalysisRuns(ctx.firm.id, id, 10);
    const cached = runs.map(parseCachedOverview).find(Boolean) ?? null;
    return NextResponse.json({ ok: true, summary: cached });
  } catch (error) {
    return serverError("api.summarize.get_failed", error);
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`ai:${ctx.user.email}`, 20, 60_000);
  if (limited) return limited;

  const { id } = await params;
  try {
    const opp = await getOpportunityById(id);
    if (!opp) return notFound("Opportunity not found");
    const summary = await summarizeOpportunityOverview(opp, ctx.firm, ctx.user.email);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return serverError("api.summarize.failed", error, "Summary failed");
  }
}
