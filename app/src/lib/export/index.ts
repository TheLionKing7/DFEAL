/**
 * Unified export orchestrator for DFEAL proposal documents.
 * Supports PDF and DOCX formats with consistent branding.
 */
import { renderProposalPdf } from "@/lib/export/render-proposal-pdf";
import { renderProposalDocx } from "@/lib/export/render-proposal-docx";
import type { DocumentMeta } from "@/lib/export/dfeal-styles";

export type ExportFormat = "pdf" | "docx";

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  format: ExportFormat;
  contentType: string;
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function exportProposal(
  content: string,
  meta: DocumentMeta,
  format: ExportFormat = "pdf",
): Promise<ExportResult> {
  let result: { buffer: Buffer; filename: string };

  switch (format) {
    case "docx":
      result = await renderProposalDocx(content, meta);
      break;
    case "pdf":
    default:
      result = await renderProposalPdf(content, meta);
      break;
  }

  return {
    ...result,
    format,
    contentType: CONTENT_TYPES[format],
  };
}
