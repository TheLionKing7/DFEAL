import { NextResponse } from "next/server";
import { getDailyBriefing } from "@/lib/briefing/build-briefing";
import { requireFirmApi } from "@/lib/firms/context";
import { serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

export const maxDuration = 90;

/** Today's stored briefing (generated on first request of the day). */
export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ briefing: await getDailyBriefing(ctx.firm) });
  } catch (error) {
    return serverError("api.briefing.failed", error);
  }
}

/** Regenerate today's briefing from the latest data. */
export async function POST() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`briefing:${ctx.firm.id}`, 6, 60 * 60_000);
  if (limited) return limited;
  try {
    return NextResponse.json({ briefing: await getDailyBriefing(ctx.firm, { regenerate: true }) });
  } catch (error) {
    return serverError("api.briefing.regenerate_failed", error);
  }
}
