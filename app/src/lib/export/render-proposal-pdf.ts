/**
 * Professional PDF renderer for DFEAL proposal documents.
 * Produces top-grade branded output with cover pages, section headers,
 * tables, page numbers, and consistent typography.
 */
import PDFDocument from "pdfkit";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import { DFEAL_STYLES, type DocumentMeta } from "@/lib/export/dfeal-styles";

const S = DFEAL_STYLES;

function parseMarkdownBlocks(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: {
    type: "h1" | "h2" | "h3" | "bullet" | "para" | "divider" | "table" | "table-row";
    text: string;
    cells?: string[];
  }[] = [];
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
      // Skip separator rows (|---|)
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

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  text: string,
  level: "h1" | "h2" | "h3",
) {
  const { navy, gold, lightGray } = S.brand;
  const fontSize = S.typography.headingSizes[level];
  const left = S.layout.marginLeft;
  const width = S.layout.lineWidth;

  if (level === "h1") {
    // Major section: navy background band
    doc.save();
    doc.rect(left, doc.y, width, 36).fill(navy);
    doc.fillColor(S.brand.white).fontSize(fontSize).font(S.typography.fontBold);
    doc.text(text.toUpperCase(), left + 12, doc.y + 9, { width: width - 24 });
    doc.restore();
    doc.moveDown(1);
  } else if (level === "h2") {
    // Sub-section: gold left bar + navy text
    doc.save();
    doc.rect(left, doc.y, 4, 20).fill(gold);
    doc.fillColor(navy).fontSize(fontSize).font(S.typography.fontBold);
    doc.text(text, left + 14, doc.y, { width: width - 14 });
    doc.restore();
    doc.moveDown(0.6);
  } else {
    // Sub-sub-section: italic bold
    doc.save();
    doc.fillColor(navy).fontSize(fontSize).font(S.typography.fontBold);
    doc.text(text, left, doc.y, { width });
    doc.restore();
    doc.moveDown(0.3);
  }
}

function getTextHeight(doc: PDFKit.PDFDocument, text: string, width: number): number {
  const opts = { width, align: "justify" as const, lineGap: 3, paragraphGap: 8 };
  return doc.heightOfString(text, opts);
}

function checkPageBreak(doc: PDFKit.PDFDocument, neededHeight: number) {
  const bottom = doc.page.height - S.layout.marginBottom;
  if (doc.y + neededHeight > bottom) {
    doc.addPage();
  }
}

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
      const ext = "pdf";
      const name = `${meta.title || "dfeal-proposal"}.${ext}`;
      resolve({ buffer, filename: name });
    });
    doc.on("error", reject);

    const { navy, gold, white, mutedGray, lightGray, offWhite, darkGray, mediumGray } =
      S.brand;

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

    for (const block of blocks) {
      if (block.type === "table" || block.type === "table-row") continue;

      // Calculate needed height
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

      switch (block.type) {
        case "h1":
        case "h2":
        case "h3":
          drawSectionHeader(doc, block.text, block.type);
          break;
        case "bullet":
          doc.save();
          doc.fillColor(mediumGray).fontSize(S.typography.bodySize).font(S.typography.font);
          const bulletColor = gold;
          doc.fillColor(bulletColor);
          doc.circle(S.layout.marginLeft + 4, doc.y + 6, 2.5).fill();
          doc.fillColor(mediumGray);
          doc.text(`  ${block.text}`, S.layout.marginLeft + 14, doc.y, {
            width: S.layout.lineWidth - 14,
            lineGap: 4,
          });
          doc.restore();
          break;
        case "para":
          doc.save();
          doc
            .fillColor(darkGray)
            .fontSize(S.typography.bodySize)
            .font(S.typography.font);
          doc.text(block.text, S.layout.marginLeft, doc.y, {
            width: S.layout.lineWidth,
            align: "justify",
            lineGap: 3,
            paragraphGap: 8,
          });
          doc.restore();
          break;
        case "divider":
          doc.save();
          doc.strokeColor(lightGray).lineWidth(1);
          doc
            .moveTo(S.layout.marginLeft, doc.y + 4)
            .lineTo(S.layout.marginLeft + S.layout.lineWidth, doc.y + 4)
            .stroke();
          doc.moveDown(1);
          doc.restore();
          break;
      }
    }

    // ============================================================
    // PAGE NUMBERING
    // ============================================================
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      if (i === 0) continue; // No footer on cover
      addFooter(doc, i + 1, pages.count);
    }

    doc.end();
  });
}
