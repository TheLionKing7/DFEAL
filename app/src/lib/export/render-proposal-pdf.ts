/**
 * Professional PDF renderer for DFEAL proposal documents.
 * Produces top-grade branded output with cover pages, section headers,
 * tables, page numbers, and consistent typography.
 * Now with inline markdown support — no raw `**`, `*`, or `[links]` in output.
 */
import PDFDocument from "pdfkit";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import { DFEAL_STYLES, type DocumentMeta } from "@/lib/export/dfeal-styles";
import { parseInlineMarkdown } from "@/lib/export/parse-markdown";

const S = DFEAL_STYLES;

// ----------------------------------------------------------------
// Block-level markdown parser
// ----------------------------------------------------------------
interface MarkdownBlock {
  type: "h1" | "h2" | "h3" | "bullet" | "numbered" | "para" | "divider" | "table" | "table-row";
  text: string;
  cells?: string[];
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let para = "";

  function flushPara() {
    const t = para.trim();
    if (t) blocks.push({ type: "para", text: t });
    para = "";
  }

  let inTable = false;
  let tableRows: string[][] = [];

  function flushTable() {
    if (tableRows.length > 0) {
      blocks.push({ type: "table", text: "", cells: undefined });
      for (const row of tableRows) {
        blocks.push({ type: "table-row", text: "", cells: row });
      }
      tableRows = [];
    }
    inTable = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      if (inTable) flushTable();
      continue;
    }

    // Table rows (pipe-delimited)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|")) {
      flushPara();
      const cells = trimmed
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      // Skip separator rows
      if (cells.length > 0 && !/^[-:]+$/.test(cells[0])) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(cells);
      }
      continue;
    }

    if (inTable) flushTable();

    if (trimmed.startsWith("### ")) {
      flushPara();
      blocks.push({ type: "h3", text: trimmed.slice(4) });
    } else if (trimmed.startsWith("## ")) {
      flushPara();
      blocks.push({ type: "h2", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("# ")) {
      flushPara();
      blocks.push({ type: "h1", text: trimmed.slice(2) });
    } else if (/^\d+[.)]\s+/.test(trimmed)) {
      flushPara();
      blocks.push({ type: "numbered", text: trimmed });
    } else if (/^[-*•]\s+/.test(trimmed)) {
      flushPara();
      blocks.push({ type: "bullet", text: trimmed.replace(/^[-*•]\s+/, "") });
    } else if (/^_{3,}$/.test(trimmed) || /^---$/.test(trimmed)) {
      flushPara();
      blocks.push({ type: "divider", text: "" });
    } else {
      para = para ? `${para} ${trimmed}` : trimmed;
    }
  }
  flushPara();
  if (inTable) flushTable();
  return blocks;
}

// ----------------------------------------------------------------
// Clean heading text (strip inline markdown for headers)
// ----------------------------------------------------------------
function cleanHeading(raw: string): string {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*\*|___/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "");
}

// ----------------------------------------------------------------
// Footer helper
// ----------------------------------------------------------------
function addFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number) {
  const { mutedGray } = S.brand;
  doc.save();
  doc.fontSize(8).fillColor(mutedGray).font(S.typography.font);
  doc.text(
    `${DFEAL_PROFILE.legalName} — Confidential Proposal`,
    S.layout.marginLeft,
    doc.page.height - S.layout.footerY,
    { width: S.layout.lineWidth, align: "left" },
  );
  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    S.layout.marginLeft,
    doc.page.height - S.layout.footerY,
    { width: S.layout.lineWidth, align: "right" },
  );
  doc.restore();
}

// ----------------------------------------------------------------
// Section header drawing
// ----------------------------------------------------------------
function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  text: string,
  level: "h1" | "h2" | "h3",
) {
  const { navy, gold } = S.brand;
  const fontSize = S.typography.headingSizes[level];
  const left = S.layout.marginLeft;
  const width = S.layout.lineWidth;
  const clean = cleanHeading(text);

  if (level === "h1") {
    doc.save();
    doc.rect(left, doc.y, width, 36).fill(navy);
    doc.fillColor(S.brand.white).fontSize(fontSize).font(S.typography.fontBold);
    doc.text(clean.toUpperCase(), left + 12, doc.y + 9, { width: width - 24 });
    doc.restore();
    doc.moveDown(1);
  } else if (level === "h2") {
    doc.save();
    doc.rect(left, doc.y, 4, 20).fill(gold);
    doc.fillColor(navy).fontSize(fontSize).font(S.typography.fontBold);
    doc.text(clean, left + 14, doc.y, { width: width - 14 });
    doc.restore();
    doc.moveDown(0.6);
  } else {
    doc.save();
    doc.fillColor(navy).fontSize(fontSize).font(S.typography.fontBold);
    doc.text(clean, left, doc.y, { width });
    doc.restore();
    doc.moveDown(0.3);
  }
}

// ----------------------------------------------------------------
// Main PDF renderer
// ----------------------------------------------------------------
export async function renderProposalPdf(
  content: string,
  meta: DocumentMeta,
): Promise<{ buffer: Buffer; filename: string }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: {
        top: S.layout.marginTop,
        bottom: S.layout.marginBottom,
        left: S.layout.marginLeft,
        right: S.layout.marginRight,
      },
      bufferPages: true,
      info: {
        Title: meta.title,
        Author: DFEAL_PROFILE.legalName,
        Subject: `Proposal Document — ${meta.documentType ?? ""}`,
        Creator: "DFEAL Smart Capture Platform",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const name = `${meta.title || "dfeal-proposal"}.pdf`;
      resolve({ buffer, filename: name });
    });
    doc.on("error", reject);

    const { navy, gold, white, mutedGray, lightGray, offWhite, darkGray } = S.brand;

    // ============================================================
    // COVER PAGE
    // ============================================================
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;

    // Top navy band
    doc.rect(0, 0, pageWidth, S.coverPage.bandHeight).fill(navy);
    // Gold accent line
    doc.rect(0, S.coverPage.bandHeight, pageWidth, 4).fill(gold);

    // DFEAL name
    doc.save();
    doc.fillColor(white).fontSize(28).font(S.typography.fontBold);
    doc.text(DFEAL_PROFILE.legalName, S.layout.marginLeft, 60, {
      width: S.layout.lineWidth,
    });
    doc.fillColor(gold).fontSize(12).font(S.typography.font);
    doc.text("Proposal Document", S.layout.marginLeft, 96, {
      width: S.layout.lineWidth,
    });
    doc.restore();

    // Document title area
    doc.save();
    doc.fillColor(navy).fontSize(22).font(S.typography.fontBold);
    const titleY = 180;
    doc.text(meta.title, S.layout.marginLeft, titleY, {
      width: S.layout.lineWidth,
    });
    doc.restore();

    // Meta information block
    const metaY = titleY + 60;
    const metaItems: { label: string; value: string | undefined }[] = [
      { label: "Document type", value: meta.documentType },
      { label: "Solicitation", value: meta.noticeId },
      { label: "Agency", value: meta.agency },
      { label: "Response deadline", value: meta.responseDeadline },
      { label: "Set-aside", value: meta.setAside },
      { label: "NAICS", value: meta.naics },
    ];

    doc.save();
    doc.fontSize(9).font(S.typography.font);
    let my = metaY;
    for (const item of metaItems) {
      if (item.value) {
        doc.fillColor(mutedGray).text(`${item.label}:`, S.layout.marginLeft, my, {
          width: 100,
          continued: true,
        });
        doc.fillColor(darkGray).font(S.typography.fontBold).text(` ${item.value}`);
        my += 16;
      }
    }
    doc.restore();

    // Bottom strip
    const bottomY = pageHeight - S.coverPage.bottomBandHeight;
    doc.rect(0, bottomY, pageWidth, S.coverPage.bottomBandHeight).fill(navy);
    doc.save();
    doc.fillColor(white).fontSize(9).font(S.typography.font);
    doc.text(
      `${DFEAL_PROFILE.website} · ${DFEAL_PROFILE.phone} · ${DFEAL_PROFILE.address}`,
      S.layout.marginLeft,
      bottomY + 10,
      { width: S.layout.lineWidth, align: "center" },
    );
    doc.restore();

    doc.addPage();

    // ============================================================
    // DOCUMENT CONTENT
    // ============================================================
    const blocks = parseMarkdownBlocks(content);
    const bottomLimit = doc.page.height - S.layout.marginBottom;
    const left = S.layout.marginLeft;
    const lineWidth = S.layout.lineWidth;

    // State for table rendering
    let tableHeader: string[] | null = null;
    let tableRows: string[][] = [];

    for (const block of blocks) {
      // -------------------------------------------------
      // Table — start / end
      // -------------------------------------------------
      if (block.type === "table") {
        // Beginning of a new table
        tableHeader = null;
        tableRows = [];
        continue;
      }

      if (block.type === "table-row") {
        const cells = block.cells ?? [];
        if (!tableHeader) {
          tableHeader = cells;
        } else {
          tableRows.push(cells);
        }
        // Don't render until we know the table is complete
        continue;
      }

      // If we have a buffered table and now hit a non-table block, flush it
      if (tableHeader && tableRows.length > 0) {
        flushTable: {
          const allRows = [tableHeader, ...tableRows];
          const colCount = Math.max(...allRows.map((r) => r.length));
          const colW = (lineWidth - (colCount - 1) * 4) / colCount;
          const rowHeight = 20;
          const headerHeight = 24;

          // Page break check
          const totalHeight = headerHeight + tableRows.length * rowHeight + 20;
          if (doc.y + totalHeight > bottomLimit) {
            doc.addPage();
          }

          const tableStartY = doc.y;
          let rowY = tableStartY;

          // Header row
          doc.save();
          doc.fillColor(navy);
          doc.rect(left, rowY, lineWidth, headerHeight).fill();
          doc.fillColor(white).fontSize(9).font(S.typography.fontBold);
          for (let c = 0; c < colCount; c++) {
            doc.text(
              cleanHeading(tableHeader[c] ?? ""),
              left + c * (colW + 4) + 4,
              rowY + 4,
              { width: colW - 8 },
            );
          }
          doc.restore();
          rowY += headerHeight;

          // Data rows
          for (let r = 0; r < tableRows.length; r++) {
            const bg = r % 2 === 1 ? offWhite : white;
            doc.save();
            doc.fillColor(bg);
            doc.rect(left, rowY, lineWidth, rowHeight).fill();
            doc.fillColor(darkGray).fontSize(9).font(S.typography.font);
            for (let c = 0; c < colCount; c++) {
              doc.text(
                tableRows[r][c] ?? "",
                left + c * (colW + 4) + 4,
                rowY + 3,
                { width: colW - 8 },
              );
            }
            doc.restore();
            rowY += rowHeight;
          }

          doc.y = rowY + 10;
        }
        tableHeader = null;
        tableRows = [];
      }

      // -------------------------------------------------
      // Calculate needed height for this block
      // -------------------------------------------------
      let needed = 0;
      switch (block.type) {
        case "h1":
          needed = 50;
          break;
        case "h2":
          needed = 32;
          break;
        case "h3":
          needed = 24;
          break;
        case "bullet":
        case "numbered":
          needed = 22;
          break;
        case "para": {
          const estimatedLines = Math.ceil(block.text.length / 85) || 1;
          needed = estimatedLines * 16 + 8;
          break;
        }
        case "divider":
          needed = 20;
          break;
        default:
          needed = 16;
      }

      if (doc.y + needed > bottomLimit) {
        doc.addPage();
      }

      // -------------------------------------------------
      // Render the block
      // -------------------------------------------------
      switch (block.type) {
        case "h1":
        case "h2":
        case "h3":
          drawSectionHeader(doc, block.text, block.type);
          break;

        case "numbered": {
          const match = block.text.match(/^(\d+)[.)]\s+(.+)/);
          if (match) {
            const num = match[1];
            const body = match[2];
            const segments = parseInlineMarkdown(body);
            doc.save();
            // Number in navy bold
            doc.fillColor(navy).fontSize(S.typography.bodySize).font(S.typography.fontBold);
            doc.text(`${num}.  `, left, doc.y, { continued: true, lineGap: 4 });
            // Body text with inline formatting
            for (let s = 0; s < segments.length; s++) {
              const seg = segments[s];
              const font =
                seg.bold && seg.italic
                  ? S.typography.fontBold
                  : seg.bold
                    ? S.typography.fontBold
                    : seg.italic
                      ? S.typography.fontOblique
                      : S.typography.font;
              doc.fillColor(darkGray).font(font).fontSize(S.typography.bodySize);
              const opts: Record<string, unknown> = { lineGap: 4 };
              if (s < segments.length - 1) opts.continued = true;
              doc.text(seg.text, opts);
            }
            doc.restore();
          }
          break;
        }

        case "bullet": {
          const segments = parseInlineMarkdown(block.text);
          doc.save();
          // Gold bullet dot
          doc.fillColor(gold);
          doc.circle(left + 4, doc.y + 6, 2.5).fill();
          doc.fillColor(darkGray);
          // Render inline segments
          for (let s = 0; s < segments.length; s++) {
            const seg = segments[s];
            const font =
              seg.bold && seg.italic
                ? S.typography.fontBold
                : seg.bold
                  ? S.typography.fontBold
                  : seg.italic
                    ? S.typography.fontOblique
                    : S.typography.font;
            doc.font(font).fontSize(S.typography.bodySize);
            const isLast = s === segments.length - 1;
            if (s === 0) {
              doc.text(`  ${seg.text}`, left + 14, doc.y, {
                width: lineWidth - 14,
                lineGap: 4,
                continued: !isLast,
              });
            } else {
              doc.text(seg.text, {
                continued: !isLast,
                lineGap: 4,
              });
            }
          }
          doc.restore();
          break;
        }

        case "para": {
          const segments = parseInlineMarkdown(block.text);
          doc.save();
          // Render inline-formatted paragraph
          for (let s = 0; s < segments.length; s++) {
            const seg = segments[s];
            const font =
              seg.bold && seg.italic
                ? S.typography.fontBold
                : seg.bold
                  ? S.typography.fontBold
                  : seg.italic
                    ? S.typography.fontOblique
                    : S.typography.font;
            doc.fillColor(darkGray).font(font).fontSize(S.typography.bodySize);
            const isLast = s === segments.length - 1;
            if (s === 0) {
              doc.text(seg.text, left, doc.y, {
                width: lineWidth,
                align: "justify",
                lineGap: 3,
                paragraphGap: isLast ? 8 : 0,
                continued: !isLast,
              });
            } else {
              doc.text(seg.text, {
                continued: !isLast,
                lineGap: 3,
              });
            }
          }
          doc.restore();
          break;
        }

        case "divider":
          doc.save();
          doc.strokeColor(lightGray).lineWidth(1);
          doc
            .moveTo(left, doc.y + 4)
            .lineTo(left + lineWidth, doc.y + 4)
            .stroke();
          doc.moveDown(1);
          doc.restore();
          break;
      }
    }

    // Flush any remaining table at end of document
    if (tableHeader && tableRows.length > 0) {
      const allRows = [tableHeader, ...tableRows];
      const colCount = Math.max(...allRows.map((r) => r.length));
      const colW = (lineWidth - (colCount - 1) * 4) / colCount;
      const rowHeight = 20;
      const headerHeight = 24;

      if (doc.y + headerHeight + tableRows.length * rowHeight > bottomLimit) {
        doc.addPage();
      }

      const tableStartY = doc.y;
      let rowY = tableStartY;

      doc.save();
      doc.fillColor(navy);
      doc.rect(left, rowY, lineWidth, headerHeight).fill();
      doc.fillColor(white).fontSize(9).font(S.typography.fontBold);
      for (let c = 0; c < colCount; c++) {
        doc.text(
          cleanHeading(tableHeader[c] ?? ""),
          left + c * (colW + 4) + 4,
          rowY + 4,
          { width: colW - 8 },
        );
      }
      doc.restore();
      rowY += headerHeight;

      for (let r = 0; r < tableRows.length; r++) {
        const bg = r % 2 === 1 ? offWhite : white;
        doc.save();
        doc.fillColor(bg);
        doc.rect(left, rowY, lineWidth, rowHeight).fill();
        doc.fillColor(darkGray).fontSize(9).font(S.typography.font);
        for (let c = 0; c < colCount; c++) {
          doc.text(tableRows[r][c] ?? "", left + c * (colW + 4) + 4, rowY + 3, { width: colW - 8 });
        }
        doc.restore();
        rowY += rowHeight;
      }

      doc.y = rowY + 10;
    }

    // ============================================================
    // PAGE NUMBERING
    // ============================================================
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      if (i === 0) continue;
      addFooter(doc, i + 1, pages.count);
    }

    doc.end();
  });
}