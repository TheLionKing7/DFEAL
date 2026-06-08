import { NextRequest, NextResponse } from "next/server";
import { summarizeOpportunityOverview } from "@/lib/ai/summarize-opportunity";
import { requireApiUser } from "@/lib/auth/api-user";
import { listAnalysisRuns } from "@/lib/db/analysis";
import { getOpportunityById } from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 90;

function parseCachedOverview(run: Awaited<ReturnType<typeof listAnalysisRuns>>[0]) {
  const json = run.result_json ?? {};
  if (json.kind !== "overview_summary") return null;
  return {
    executive_summary: String(json.executive_summary ?? ""),
    scope_of_work: String(json.scope_of_work ?? ""),
    key_requirements: Array.isArray(json.key_requirements) ? json.key_requirements.map(String) : [],
    important_dates: Array.isArray(json.important_dates) ? json.important_dates.map(String) : [],
    dfeal_fit: String(json.dfeal_fit ?? ""),
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
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const runs = await listAnalysisRuns(id, 10);
  const cached = runs.map(parseCachedOverview).find(Boolean);
  if (cached) return NextResponse.json({ ok: true, summary: cached });

  return NextResponse.json({ ok: true, summary: null });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { id } = await params;
  const opp = await getOpportunityById(id);
  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  try {
    const summary = await summarizeOpportunityOverview(opp, user.email ?? undefined);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Summary failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
