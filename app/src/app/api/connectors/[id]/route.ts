import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteConnector, getConnector, patchConnector } from "@/lib/connectors/store";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { requireFirmApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, notFound, readJson, serverError } from "@/lib/http/json";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  recipients: z.array(z.string().trim().toLowerCase().email()).max(25).optional(),
  allowAssistant: z.boolean().optional(),
  allowedTools: z.array(z.string().trim().max(120)).max(200).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    const connector = await getConnector(ctx.firm.id, id);
    if (!connector) return notFound("Connector not found");
    const { name, recipients, allowAssistant, allowedTools, enabled } = parsed.data;
    // Start from the stored config (the public view strips private fields such as feed tokens).
    const { data: raw } = await getSupabaseAdmin().from("connectors").select("config").eq("id", id).single();
    const config = { ...((raw?.config ?? {}) as Record<string, unknown>) };
    if (recipients) config.recipients = recipients;
    if (allowAssistant !== undefined) config.allowAssistant = allowAssistant;
    if (allowedTools) config.allowedTools = allowedTools;
    await patchConnector(ctx.firm.id, id, {
      name,
      config,
      status: enabled === undefined ? undefined : enabled ? "active" : "disabled",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.connectors.patch_failed", error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  try {
    await deleteConnector(ctx.firm.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.connectors.delete_failed", error);
  }
}
