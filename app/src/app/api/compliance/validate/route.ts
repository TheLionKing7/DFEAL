import { NextRequest, NextResponse } from "next/server";
import { validateOpportunityCompliance } from "@/lib/ai/validate-compliance";
import { requireApiUser } from "@/lib/auth/api-user";
import { getDocument } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = (await request.json()) as {
    opportunity_id?: string;
    document_id?: string;
  };

  if (!body.opportunity_id) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  const opp = await getOpportunityById(body.opportunity_id);
  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  let documentContent: string | undefined;
  if (body.document_id) {
    const doc = await getDocument(body.document_id);
    documentContent = doc?.content_text ?? undefined;
  }

  try {
    const result = await validateOpportunityCompliance({
      opp,
      documentContent,
      documentId: body.document_id,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compliance check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
