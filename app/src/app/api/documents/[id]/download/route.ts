import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { getDocument } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { exportProposal, type ExportFormat } from "@/lib/export";
import { getDocumentTypeLabel } from "@/shared/document-types";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const maxDuration = 120;

const VALID_FORMATS: ExportFormat[] = ["pdf", "docx"];

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
  const formatParam = request.nextUrl.searchParams.get("format") ?? "pdf";
  const format: ExportFormat = VALID_FORMATS.includes(formatParam as ExportFormat)
    ? (formatParam as ExportFormat)
    : "pdf";

  const document = await getDocument(id);
  if (!document?.content_text) {
    return NextResponse.json({ error: "Document not found or empty" }, { status: 404 });
  }

  const opp = document.opportunity_id
    ? await getOpportunityById(document.opportunity_id)
    : null;

  const { buffer, filename, contentType } = await exportProposal(document.content_text, {
    title: document.title ?? "Proposal Section",
    opportunityTitle: opp?.title,
    agency: opp?.agency_name ?? undefined,
    documentType: getDocumentTypeLabel(document.document_type),
    noticeId: opp?.external_id,
    setAside: opp?.set_aside ?? undefined,
    naics: opp?.naics ?? undefined,
    responseDeadline: opp?.response_deadline
      ? new Date(opp.response_deadline).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined,
  }, format);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
