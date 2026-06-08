import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { getDocument } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { renderProposalPdf } from "@/lib/export/render-proposal-pdf";
import { getDocumentTypeLabel } from "@/shared/document-types";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "pdf";

  if (format !== "pdf") {
    return NextResponse.json({ error: "Only PDF download is supported" }, { status: 400 });
  }

  const document = await getDocument(id);
  if (!document?.content_text) {
    return NextResponse.json({ error: "Document not found or empty" }, { status: 404 });
  }

  const opp = document.opportunity_id
    ? await getOpportunityById(document.opportunity_id)
    : null;

  const { buffer, filename } = await renderProposalPdf(document.content_text, {
    title: document.title ?? "Proposal Section",
    opportunityTitle: opp?.title,
    agency: opp?.agency_name ?? undefined,
    documentType: getDocumentTypeLabel(document.document_type),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
