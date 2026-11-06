import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUploadTarget } from "@/lib/documents/reference";
import { REFERENCE_MAX_BYTES } from "@/lib/documents/reference-types";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

const schema = z.object({
  fileName: z.string().trim().min(1).max(200).regex(/\.(pdf|docx|txt|md)$/i, "Upload a PDF, DOCX, TXT or Markdown file"),
  size: z.number().int().positive().max(REFERENCE_MAX_BYTES, "File is larger than 25 MB"),
});

/** Step 1 of an upload: get a signed URL to upload straight to storage. */
export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`ref-upload:${ctx.user.email}`, 20, 60_000);
  if (limited) return limited;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid file");
  try {
    return NextResponse.json(await createUploadTarget(ctx.firm.id, parsed.data.fileName));
  } catch (error) {
    return serverError("api.reference_docs.upload_url_failed", error, "Could not start upload");
  }
}
