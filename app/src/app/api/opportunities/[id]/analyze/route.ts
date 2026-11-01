import { NextRequest, NextResponse } from "next/server";
import { analyzeOpportunityWithAi } from "@/lib/ai/analyze-opportunity";
import { getOpportunityById } from "@/lib/db/opportunities";
import { requireFirmApi } from "@/lib/firms/context";
import { notFound, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

export const maxDuration = 120;

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
    const analysis = await analyzeOpportunityWithAi(opp, ctx.firm, ctx.user.email);
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    return serverError("api.analyze.failed", error, "Analysis failed");
  }
}
