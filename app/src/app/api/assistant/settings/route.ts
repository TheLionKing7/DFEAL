import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parsePersonalization, personalizationSchema } from "@/lib/assistant/personalization";
import { getAssistantSettings, saveAssistantSettings } from "@/lib/db/user-workspace";
import { requireFirmApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";

const patchSchema = z.object({
  /** Instructions for the agents that run automations and monitoring. */
  custom_instructions: z.string().max(6000).nullable().optional(),
  /** The user's mental model / working style. */
  personalization: personalizationSchema.partial().optional(),
});

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const s = await getAssistantSettings(ctx.firm.id, ctx.user.email);
    return NextResponse.json({
      settings: { custom_instructions: s.custom_instructions ?? "", personalization: parsePersonalization(s.personalization) },
    });
  } catch (error) {
    return serverError("api.assistant_settings.get_failed", error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    const existing = await getAssistantSettings(ctx.firm.id, ctx.user.email);
    const personalization = parsed.data.personalization
      ? { ...parsePersonalization(existing.personalization), ...parsed.data.personalization }
      : existing.personalization;
    await saveAssistantSettings(ctx.firm.id, ctx.user.email, {
      custom_instructions:
        parsed.data.custom_instructions !== undefined ? parsed.data.custom_instructions || null : existing.custom_instructions,
      personalization,
    });
    const s = await getAssistantSettings(ctx.firm.id, ctx.user.email);
    return NextResponse.json({
      ok: true,
      settings: { custom_instructions: s.custom_instructions ?? "", personalization: parsePersonalization(s.personalization) },
    });
  } catch (error) {
    return serverError("api.assistant_settings.patch_failed", error);
  }
}
