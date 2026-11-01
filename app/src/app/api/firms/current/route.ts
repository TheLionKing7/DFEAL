import { NextRequest, NextResponse } from "next/server";
import { requireFirmApi } from "@/lib/firms/context";
import { updateFirm } from "@/lib/firms/repository";
import { rescoreFirm } from "@/lib/firms/service";
import { firmInputSchema, formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export const maxDuration = 120;

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json({ firm: ctx.firm, role: ctx.role });
}

/** Update the active firm's profile (admin/owner). Re-scores the feed on success. */
export async function PATCH(request: NextRequest) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = firmInputSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));

  try {
    const firm = await updateFirm(ctx.firm.id, parsed.data);
    const scoring = await rescoreFirm(firm.id);
    return NextResponse.json({ ok: true, firm, scored: scoring?.scored ?? 0 });
  } catch (error) {
    return serverError("api.firms.update_failed", error, "Could not update firm");
  }
}
