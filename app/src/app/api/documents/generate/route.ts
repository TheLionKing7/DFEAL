import { NextRequest, NextResponse } from "next/server";
import { generateProposalDocument } from "@/lib/ai/generate-document";
import { requireApiUser } from "@/lib/auth/api-user";
import { getOpportunityById } from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { DOCUMENT_TYPES, type DocumentType } from "@/shared/opportunity-lanes";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = (await request.json()) as {
    opportunity_id?: string;
    document_type?: DocumentType;
    analysis_summary?: string;
  };

  if (!body.opportunity_id || !body.document_type) {
    return NextResponse.json(
      { error: "opportunity_id and document_type required" },
      { status: 400 },
    );
  }

  if (!DOCUMENT_TYPES.some((d) => d.id === body.document_type)) {
    return NextResponse.json({ error: "Invalid document_type" }, { status: 400 });
  }

  const opp = await getOpportunityById(body.opportunity_id);
  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  try {
    const { document, provider } = await generateProposalDocument({
      opp,
      documentType: body.document_type,
      userEmail: user.email,
      analysisSummary: body.analysis_summary,
    });
    return NextResponse.json({ ok: true, document, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
