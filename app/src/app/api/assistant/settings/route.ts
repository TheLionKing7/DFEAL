import { NextRequest, NextResponse } from "next/server";
import { getAssistantSettings, saveAssistantSettings } from "@/lib/db/user-workspace";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ settings: await getAssistantSettings(ctx.firm.id, ctx.user.email) });
  } catch (error) {
    return serverError("api.assistant_settings.get_failed", error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<{
    custom_instructions?: string | null;
    personalization?: Record<string, unknown>;
    memories?: { id: string; text: string; created_at: string }[];
    connector_prefs?: Record<string, unknown>;
    add_memory?: string;
  }>(request);
  if (!body) return badRequest("Invalid JSON body");

  try {
    const existing = await getAssistantSettings(ctx.firm.id, ctx.user.email);
    let memories = (body.memories ?? existing.memories).slice(0, 50);
    if (body.add_memory?.trim()) {
      memories = [
        { id: crypto.randomUUID(), text: body.add_memory.trim().slice(0, 1000), created_at: new Date().toISOString() },
        ...memories,
      ].slice(0, 50);
    }

    await saveAssistantSettings(ctx.firm.id, ctx.user.email, {
      custom_instructions:
        body.custom_instructions !== undefined
          ? body.custom_instructions?.slice(0, 4000) ?? null
          : existing.custom_instructions,
      personalization: body.personalization ?? existing.personalization,
      memories,
      connector_prefs: body.connector_prefs ?? existing.connector_prefs,
    });

    return NextResponse.json({ ok: true, settings: await getAssistantSettings(ctx.firm.id, ctx.user.email) });
  } catch (error) {
    return serverError("api.assistant_settings.patch_failed", error);
  }
}
