import { NextRequest, NextResponse } from "next/server";
import { getAutomation, runAutomation } from "@/lib/automations/engine";
import { requireFirmApi } from "@/lib/firms/context";
import { notFound, readJson, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

export const maxDuration = 300;

/** Run an automation now. `{ "dryRun": true }` previews matches without taking actions. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`automation-run:${ctx.user.email}`, 10, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const body = (await readJson<{ dryRun?: boolean }>(request)) ?? {};
  try {
    const a = await getAutomation(ctx.firm.id, id);
    if (!a || a.user_email !== ctx.user.email) return notFound("Automation not found");
    const result = await runAutomation(a, { trigger: body.dryRun ? "preview" : "manual", dryRun: body.dryRun, firm: ctx.firm });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return serverError("api.automations.run_failed", error, "Automation run failed");
  }
}
