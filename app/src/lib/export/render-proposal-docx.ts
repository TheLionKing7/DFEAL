/**
 * Professional DOCX renderer for DFEAL proposal documents.
 * Uses the `docx` library to produce compliance-grade Word documents
 * with proper styles, tables, headers/footers, and fonts.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  PageNumber,
  Header,
  Footer,
  ShadingType,
} from "docx";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import { DFEAL_STYLES, type DocumentMeta } from "@/lib/export/dfeal-styles";
import { parseInlineMarkdown } from "@/lib/export/parse-markdown";
import type { Buffer } from "buffer";

const S = DFEAL_STYLES;

// Color helpers
const color = (hex: string) => hex.replace("#", "");

/**
 * Strip inline markdown formatting from a heading string
 * so heading TextRuns don't contain `**` or `*` artifacts.
 */
function cleanHeadingText(raw: string): string {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*\*|___/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "");
}

/**
 * Build an array of TextRun children from a markdown string,
 * applying bold/italic per segment.
 */
function inlineTextRuns(
  raw: string,
  baseSize: number,
  baseColor: string,
  baseFont = "Times New Roman",
): TextRun[] {
  const c = color(baseColor);
  const segments = parseInlineMarkdown(raw);
  return segments.map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: seg.bold,
        italics: seg.italic,
        size: Math.round(baseSize * 2),
        font: baseFont,
        color: c,
      }),
  );
}

function parseMarkdownToDocx(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split(/\r?\n/);
  const elements: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    if (!line) continue;

    // -------------------------------------------------
    // Table detection (pipe-delimited)
    // -------------------------------------------------
    if (line.startsWith("|") && line.endsWith("|") && line.includes("|")) {
      const tableRows: string[][] = [];
      tableRows.push(
        line
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim()),
      );

      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next.startsWith("|") || !next.endsWith("|")) break;
        const cells = next
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim());
        if (cells.length > 0 && !/^[-:]+$/.test(cells[0])) {
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length >= 2) {
        const headerRow = tableRows[0];
        const dataRows = tableRows.slice(1);

        const table = new Table({
          rows: [
            new TableRow({
              tableHeader: true,
              children: headerRow.map(
                (cell) =>
                  new TableCell({
                    shading: {
                      type: ShadingType.CLEAR,
                      fill: color(S.brand.navy),
                    },
                    width: {
                      size: Math.round(5400 / headerRow.length),
                      type: WidthType.DXA,
                    },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({
                            text: cell,
                            bold: true,
                            size: Math.round(9 * 2),
                            font: "Times New Roman",
                            color: color(S.brand.white),
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
            ...dataRows.map(
              (row, ri) =>
                new TableRow({
                  children: row.map(
                    (cell, ci) =>
                      new TableCell({
                        shading:
                          ri % 2 === 1
                            ? {
                                type: ShadingType.CLEAR,
                                fill: color(S.brand.offWhite),
                              }
                            : undefined,
                        width: {
                          size: Math.round(5400 / headerRow.length),
                          type: WidthType.DXA,
                        },
                        children: [
                          new Paragraph({
                            spacing: { before: 40, after: 40 },
                            children: inlineTextRuns(
                              cell,
                              9,
                              S.brand.darkGray,
                            ),
                          }),
                        ],
                      }),
                  ),
                }),
            ),
          ],
        });
        elements.push(table);
        elements.push(new Paragraph({ spacing: { before: 200 } }));
      }
      continue;
    }

    // -------------------------------------------------
    // Headings (strip inline markdown from heading text)
    // -------------------------------------------------
    if (line.startsWith("# ")) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 200 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: color(S.brand.navy),
            },
          },
          children: [
            new TextRun({
              text: cleanHeadingText(line.slice(2)),
              bold: true,
              size: Math.round(S.typography.headingSizes.h1 * 2),
              font: "Times New Roman",
              color: color(S.brand.navy),
            }),
          ],
        }),
      );
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 160 },
          children: [
            new TextRun({
              text: cleanHeadingText(line.slice(3)),
              bold: true,
              size: Math.round(S.typography.headingSizes.h2 * 2),
              font: "Times New Roman",
              color: color(S.brand.navy),
            }),
          ],
        }),
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 120 },
          children: [
            new TextRun({
              text: cleanHeadingText(line.slice(4)),
              bold: true,
              size: Math.round(S.typography.headingSizes.h3 * 2),
              font: "Times New Roman",
              color: color(S.brand.navy),
            }),
          ],
        }),
      );
      continue;
    }

    // -------------------------------------------------
    // Numbered list (e.g. 1. Item)
    // -------------------------------------------------
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (numberedMatch) {
      const numberStr = numberedMatch[1];
      const body = numberedMatch[2];
      elements.push(
        new Paragraph({
          spacing: { before: 60, after: 60, line: 340 },
          children: [
            new TextRun({
              text: `${numberStr}.  `,
              bold: true,
              size: Math.round(S.typography.bodySize * 2),
              font: "Times New Roman",
              color: color(S.brand.navy),
            }),
            ...inlineTextRuns(body, S.typography.bodySize, S.brand.darkGray),
          ],
        }),
      );
      continue;
    }

    // -------------------------------------------------
    // Bullets
    // -------------------------------------------------
    if (/^[-*•]\s+/.test(line)) {
      const bulletText = line.replace(/^[-*•]\s+/, "");
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 60, after: 60, line: 340 },
          children: inlineTextRuns(
            bulletText,
            S.typography.bodySize,
            S.brand.darkGray,
          ),
        }),
      );
      continue;
    }

    // -------------------------------------------------
    // Dividers
    // -------------------------------------------------
    if (/^_{3,}$/.test(line) || /^---$/.test(line)) {
      elements.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            top: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: color(S.brand.lightGray),
            },
          },
          children: [],
        }),
      );
      continue;
    }

    // -------------------------------------------------
    // Regular paragraph — with inline markdown
    // -------------------------------------------------
    elements.push(
      new Paragraph({
        spacing: { after: 160, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
        children: inlineTextRuns(
          line,
          S.typography.bodySize,
          S.brand.darkGray,
        ),
      }),
    );
  }

  return elements;
}

export async function renderProposalDocx(
  content: string,
  meta: DocumentMeta,
): Promise<{ buffer: Buffer; filename: string }> {
  const bodyElements = parseMarkdownToDocx(content);

  // Cover page content
  const coverPageElements: (Paragraph | Table)[] = [
    // Spacer
    new Paragraph({ spacing: { before: 3000 } }),
    // DFEAL name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: DFEAL_PROFILE.legalName,
          bold: true,
          size: Math.round(28 * 2),
          font: "Times New Roman",
          color: color(S.brand.navy),
        }),
      ],
    }),
    // Gold line
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 8,
          color: color(S.brand.gold),
        },
      },
      children: [],
    }),
    // "Proposal Document" subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Proposal Document",
          size: Math.round(14 * 2),
          font: "Times New Roman",
          color: color(S.brand.gold),
        }),
      ],
    }),
    // Document title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: meta.title,
          bold: true,
          size: Math.round(22 * 2),
          font: "Times New Roman",
          color: color(S.brand.navy),
        }),
      ],
    }),
  ];

  // Meta info table
  const metaPairs: { label: string; value: string | undefined }[] = [
    { label: "Document type", value: meta.documentType },
    { label: "Solicitation", value: meta.noticeId },
    { label: "Agency", value: meta.agency },
    { label: "Response deadline", value: meta.responseDeadline },
    { label: "Set-aside", value: meta.setAside },
    { label: "NAICS", value: meta.naics },
  ];

  const metaRows = metaPairs
    .filter((m) => m.value)
    .map(
      (m) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: m.label,
                      bold: true,
                      size: Math.round(9 * 2),
                      font: "Times New Roman",
                      color: color(S.brand.mutedGray),
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 3400, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: m.value,
                      size: Math.round(9 * 2),
                      font: "Times New Roman",
                      color: color(S.brand.darkGray),
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    );

  if (metaRows.length > 0) {
    coverPageElements.push(
      new Table({
        rows: metaRows,
        width: { size: 5400, type: WidthType.DXA },
      }),
    );
  }

  // Bottom contact line
  coverPageElements.push(new Paragraph({ spacing: { before: 4000 } }));
  coverPageElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${DFEAL_PROFILE.website} · ${DFEAL_PROFILE.phone} · ${DFEAL_PROFILE.address}`,
          size: Math.round(9 * 2),
          font: "Times New Roman",
          color: color(S.brand.mutedGray),
        }),
      ],
    }),
  );

  // Section break after cover
  coverPageElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "",
          size: Math.round(12 * 2),
        }),
      ],
    }),
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: Math.round(S.typography.bodySize * 2),
            color: color(S.brand.darkGray),
          },
          paragraph: {
            spacing: { after: 160, line: 360 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 4,
                    color: color(S.brand.gold),
                  },
                },
                children: [
                  new TextRun({
                    text: `${DFEAL_PROFILE.legalName} — Confidential Proposal`,
                    size: Math.round(8 * 2),
                    font: "Times New Roman",
                    color: color(S.brand.mutedGray),
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 4,
                    color: color(S.brand.lightGray),
                  },
                },
                children: [
                  new TextRun({
                    text: "Page ",
                    size: Math.round(8 * 2),
                    font: "Times New Roman",
                    color: color(S.brand.mutedGray),
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: Math.round(8 * 2),
                    font: "Times New Roman",
                    color: color(S.brand.mutedGray),
                  }),
                  new TextRun({
                    text: " of ",
                    size: Math.round(8 * 2),
                    font: "Times New Roman",
                    color: color(S.brand.mutedGray),
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: Math.round(8 * 2),
                    font: "Times New Roman",
                    color: color(S.brand.mutedGray),
                  }),
                ],
              }),
            ],
          }),
        },
        children: [...coverPageElements, ...bodyElements],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const name = `${meta.title || "dfeal-proposal"}.docx`;
  return { buffer: buffer as unknown as Buffer, filename: name };
}