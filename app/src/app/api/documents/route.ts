import { NextRequest, NextResponse } from "next/server";
import { generateProposalDocument } from "@/lib/ai/generate-document";
import { getDocument, listDocuments } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, notFound, readJson, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";
import { DOCUMENT_TYPES, type DocumentType } from "@/shared/document-types";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const document = await getDocument(ctx.firm.id, id);
      if (!document) return notFound();
      return NextResponse.json({ document });
    }

    const opportunityId = request.nextUrl.searchParams.get("opportunity_id") ?? undefined;
    const documents = await listDocuments({
      firmId: ctx.firm.id,
      opportunityId,
      userEmail: ctx.user.email,
    });
    return NextResponse.json({ documents });
  } catch (error) {
    return serverError("api.documents.get_failed", error);
  }
}

export async function generateDocumentHandler(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`ai:${ctx.user.email}`, 20, 60_000);
  if (limited) return limited;

  const body = await readJson<{
    opportunity_id?: string;
    document_type?: DocumentType;
    analysis_summary?: string;
  }>(request);
  if (!body?.opportunity_id || !body.document_type) {
    return badRequest("opportunity_id and document_type required");
  }
  if (!DOCUMENT_TYPES.some((d) => d.id === body.document_type)) {
    return badRequest("Invalid document_type");
  }

  try {
    const opp = await getOpportunityById(body.opportunity_id);
    if (!opp) return notFound("Opportunity not found");

    const { document, provider } = await generateProposalDocument({
      opp,
      firm: ctx.firm,
      documentType: body.document_type,
      userEmail: ctx.user.email,
      analysisSummary: body.analysis_summary?.slice(0, 6000),
    });
    return NextResponse.json({ ok: true, document, provider });
  } catch (error) {
    return serverError("api.documents.generate_failed", error, "Generation failed");
  }
}

export async function POST(request: NextRequest) {
  return generateDocumentHandler(request);
}
