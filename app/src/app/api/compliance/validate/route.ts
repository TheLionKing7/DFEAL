import { NextRequest, NextResponse } from "next/server";
import { validateOpportunityCompliance } from "@/lib/ai/validate-compliance";
import { getDocument } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, notFound, readJson, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`ai:${ctx.user.email}`, 20, 60_000);
  if (limited) return limited;

  const body = await readJson<{ opportunity_id?: string; document_id?: string }>(request);
  if (!body?.opportunity_id) return badRequest("opportunity_id required");

  try {
    const opp = await getOpportunityById(body.opportunity_id);
    if (!opp) return notFound("Opportunity not found");

    let documentContent: string | undefined;
    if (body.document_id) {
      const doc = await getDocument(ctx.firm.id, body.document_id);
      if (!doc) return notFound("Document not found");
      documentContent = doc.content_text ?? undefined;
    }

    const result = await validateOpportunityCompliance({
      opp,
      firm: ctx.firm,
      documentContent,
      documentId: body.document_id,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return serverError("api.compliance.failed", error, "Compliance check failed");
  }
}
