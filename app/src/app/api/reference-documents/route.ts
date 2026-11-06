import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createReferenceDocument, listReferenceDocuments } from "@/lib/documents/reference";
import { REFERENCE_DOC_TYPES } from "@/lib/documents/reference-types";
import { requireFirmApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export const maxDuration = 120;

const docTypes = REFERENCE_DOC_TYPES.map((t) => t.id) as [string, ...string[]];

const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    docType: z.enum(docTypes).default("other"),
    notes: z.string().trim().max(1000).optional(),
    upload: z
      .object({ path: z.string().min(1).max(400), fileName: z.string().min(1).max(200), mimeType: z.string().max(200).default("") })
      .optional(),
    text: z.string().max(200_000).optional(),
  })
  .refine((v) => Boolean(v.upload) !== Boolean(v.text), { message: "Provide an uploaded file or pasted text" });

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ documents: await listReferenceDocuments(ctx.firm.id), canManage: ctx.role !== "member" });
  } catch (error) {
    return serverError("api.reference_docs.list_failed", error);
  }
}

/** Step 2 of an upload (or a pasted-text document): extract text and register it. */
export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    const doc = await createReferenceDocument({
      firmId: ctx.firm.id,
      uploadedBy: ctx.user.email,
      title: parsed.data.title,
      docType: parsed.data.docType as never,
      notes: parsed.data.notes,
      upload: parsed.data.upload,
      text: parsed.data.text,
    });
    return NextResponse.json({ ok: true, document: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
