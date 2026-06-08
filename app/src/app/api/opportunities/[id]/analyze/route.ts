import { NextRequest, NextResponse } from "next/server";
import { analyzeOpportunityWithAi } from "@/lib/ai/analyze-opportunity";
import { requireApiUser } from "@/lib/auth/api-user";
import { getOpportunityById } from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 120;

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
    const analysis = await analyzeOpportunityWithAi(opp, user.email ?? undefined);
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
