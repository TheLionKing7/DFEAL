import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { deleteReferenceDocument, referenceDownloadUrl, updateReferenceDocument } from "@/lib/documents/reference";
import { REFERENCE_DOC_TYPES } from "@/lib/documents/reference-types";
import { hasRole, requireFirmApi, type FirmContext } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, notFound, readJson, serverError } from "@/lib/http/json";

const docTypes = REFERENCE_DOC_TYPES.map((t) => t.id) as [string, ...string[]];
const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  docType: z.enum(docTypes).optional(),
  useForDrafting: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

/** Admins manage every document; members manage the ones they uploaded. */
async function canManage(ctx: FirmContext, id: string) {
  if (hasRole(ctx, "admin")) return true;
  const { data } = await getSupabaseAdmin().from("firm_documents").select("uploaded_by").eq("firm_id", ctx.firm.id).eq("id", id).maybeSingle();
  return data?.uploaded_by === ctx.user.email;
}

/** Download the original file (short-lived signed URL). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const url = await referenceDownloadUrl(ctx.firm.id, id);
  if (!url) return notFound("No original file stored for this document");
  return NextResponse.redirect(url);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await canManage(ctx, id))) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    await updateReferenceDocument(ctx.firm.id, id, { ...parsed.data, docType: parsed.data.docType as never });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.reference_docs.patch_failed", error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!(await canManage(ctx, id))) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  try {
    await deleteReferenceDocument(ctx.firm.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.reference_docs.delete_failed", error);
  }
}
