import { NextRequest, NextResponse } from "next/server";
import { recommendDocuments } from "@/lib/documents/recommend-document";
import { getOpportunityById } from "@/lib/db/opportunities";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, notFound, serverError } from "@/lib/http/json";

export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
  if (!opportunityId) return badRequest("opportunity_id required");

  try {
    const opp = await getOpportunityById(opportunityId);
    if (!opp) return notFound("Opportunity not found");

    const recommendations = recommendDocuments(opp);
    return NextResponse.json({
      opportunity_id: opportunityId,
      notice_type: opp.notice_type,
      primary: recommendations[0] ?? null,
      recommendations,
    });
  } catch (error) {
    return serverError("api.documents.recommend_failed", error);
  }
}
