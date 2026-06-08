import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { recommendDocuments } from "@/lib/documents/recommend-document";
import { getOpportunityById } from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
  if (!opportunityId) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  const opp = await getOpportunityById(opportunityId);
  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const recommendations = recommendDocuments(opp);
  return NextResponse.json({
    opportunity_id: opportunityId,
    notice_type: opp.notice_type,
    primary: recommendations[0] ?? null,
    recommendations,
  });
}
