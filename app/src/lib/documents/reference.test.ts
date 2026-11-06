import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph } from "docx";
import PDFDocument from "pdfkit";
import { extractText } from "@/lib/documents/reference";

function pdfBuffer(text: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.text(text);
    doc.end();
  });
}

describe("reference document text extraction", () => {
  it("reads text and markdown", async () => {
    expect(await extractText(Buffer.from("Hello   world\n\n\n\nBye"), "a.md", "text/markdown")).toBe("Hello world\n\nBye");
  });

  it("reads DOCX", async () => {
    const buf = await Packer.toBuffer(
      new Document({ sections: [{ children: [new Paragraph("Acme delivered EHR modernization for the VA.")] }] }),
    );
    expect(await extractText(Buffer.from(buf), "cap.docx", "")).toContain("EHR modernization for the VA");
  });

  it("reads text-based PDFs", async () => {
    const buf = await pdfBuffer("Past performance: Clinical trial coordination for NIH.");
    expect(await extractText(buf, "pp.pdf", "application/pdf")).toContain("Clinical trial coordination for NIH");
  });

  it("rejects unsupported types", async () => {
    await expect(extractText(Buffer.from("x"), "a.xlsx", "")).rejects.toThrow(/Unsupported/);
  });
});
