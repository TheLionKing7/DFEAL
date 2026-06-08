import PDFDocument from "pdfkit";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";

interface PdfMeta {
  title: string;
  opportunityTitle?: string;
  agency?: string;
  documentType?: string;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
}

function parseMarkdownBlocks(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: { type: "h1" | "h2" | "h3" | "bullet" | "para"; text: string }[] = [];
  let para = "";

  function flushPara() {
    const t = para.trim();
    if (t) blocks.push({ type: "para", text: t });
    para = "";
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      continue;
    }
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
    } else {
      para = para ? `${para} ${trimmed}` : trimmed;
    }
  }
  flushPara();
  return blocks;
}

export async function renderProposalPdf(
  content: string,
  meta: PdfMeta,
): Promise<{ buffer: Buffer; filename: string }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const filename = `${sanitizeFilename(meta.title || "dfeal-proposal")}.pdf`;
      resolve({ buffer, filename });
    });
    doc.on("error", reject);

    const navy = "#0f2744";
    const gold = "#c9a227";
    const muted = "#64748b";

    // Cover header band
    doc.rect(0, 0, doc.page.width, 96).fill(navy);
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold");
    doc.text(DFEAL_PROFILE.legalName, 72, 36, { width: doc.page.width - 144 });
    doc.fontSize(10).font("Helvetica").fillColor(gold);
    doc.text("Capture & Proposal Services", 72, 62);

    doc.y = 120;
    doc.fillColor(navy).fontSize(16).font("Helvetica-Bold");
    doc.text(meta.title, { align: "left" });

    if (meta.opportunityTitle || meta.agency) {
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor(muted);
      const sub = [meta.documentType, meta.agency, meta.opportunityTitle]
        .filter(Boolean)
        .join(" · ");
      doc.text(sub, { width: doc.page.width - 144 });
    }

    doc.moveDown(1);
    doc.strokeColor("#e2e8f0").lineWidth(1);
    doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).stroke();
    doc.moveDown(1);

    const blocks = parseMarkdownBlocks(content);
    const bottom = doc.page.height - 72;

    for (const block of blocks) {
      if (doc.y > bottom - 40) doc.addPage();

      switch (block.type) {
        case "h1":
          doc.moveDown(0.5);
          doc.fillColor(navy).fontSize(14).font("Helvetica-Bold");
          doc.text(block.text, { width: doc.page.width - 144 });
          doc.moveDown(0.3);
          break;
        case "h2":
          doc.moveDown(0.4);
          doc.fillColor(navy).fontSize(12).font("Helvetica-Bold");
          doc.text(block.text, { width: doc.page.width - 144 });
          doc.moveDown(0.2);
          break;
        case "h3":
          doc.moveDown(0.3);
          doc.fillColor(navy).fontSize(11).font("Helvetica-Bold");
          doc.text(block.text, { width: doc.page.width - 144 });
          doc.moveDown(0.15);
          break;
        case "bullet":
          doc.fillColor("#1e293b").fontSize(10.5).font("Helvetica");
          doc.text(`•  ${block.text}`, {
            width: doc.page.width - 144,
            indent: 12,
            paragraphGap: 4,
          });
          break;
        default:
          doc.fillColor("#334155").fontSize(10.5).font("Helvetica");
          doc.text(block.text, {
            width: doc.page.width - 144,
            align: "justify",
            lineGap: 3,
            paragraphGap: 8,
          });
      }
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(muted).font("Helvetica");
      doc.text(
        `${DFEAL_PROFILE.legalName} — Confidential`,
        72,
        doc.page.height - 48,
        { width: doc.page.width - 200, align: "left" },
      );
      doc.text(`Page ${i + 1} of ${pages.count}`, 72, doc.page.height - 48, {
        width: doc.page.width - 144,
        align: "right",
      });
    }

    doc.end();
  });
}
