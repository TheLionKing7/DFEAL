import { NextRequest, NextResponse } from "next/server";
import { automationInputSchema } from "@/lib/automations/schema";
import { deleteAutomation, listAutomations, upsertAutomation } from "@/lib/db/user-workspace";
import { requireFirmApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ automations: await listAutomations(ctx.firm.id, ctx.user.email) });
  } catch (error) {
    return serverError("api.automations.get_failed", error);
  }
}

/** Create or update an automation (agent). */
export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = automationInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    const automation = await upsertAutomation(ctx.firm.id, ctx.user.email, {
      id: parsed.data.id,
      name: parsed.data.name,
      enabled: parsed.data.enabled,
      description: parsed.data.description ?? null,
      config: parsed.data.config,
    });
    return NextResponse.json({ ok: true, automation });
  } catch (error) {
    return serverError("api.automations.post_failed", error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");
  try {
    await deleteAutomation(ctx.firm.id, ctx.user.email, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.automations.delete_failed", error);
  }
}
