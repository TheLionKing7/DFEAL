import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/db/documents";
import { getOpportunityById } from "@/lib/db/opportunities";
import { exportProposal, type ExportFormat } from "@/lib/export";
import { requireFirmApi } from "@/lib/firms/context";
import { notFound, serverError } from "@/lib/http/json";
import { getDocumentTypeLabel } from "@/shared/document-types";

export const maxDuration = 120;

const VALID_FORMATS: ExportFormat[] = ["pdf", "docx"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const formatParam = request.nextUrl.searchParams.get("format") ?? "pdf";
  const format: ExportFormat = VALID_FORMATS.includes(formatParam as ExportFormat)
    ? (formatParam as ExportFormat)
    : "pdf";

  try {
    const document = await getDocument(ctx.firm.id, id);
    if (!document?.content_text) return notFound("Document not found or empty");

    const opp = document.opportunity_id ? await getOpportunityById(document.opportunity_id) : null;

    const { buffer, filename, contentType } = await exportProposal(
      document.content_text,
      {
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
      },
      format,
      ctx.firm,
    );

    const safeName = filename.replace(/[^\w.\- ()]/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return serverError("api.documents.download_failed", error, "Export failed");
  }
}
