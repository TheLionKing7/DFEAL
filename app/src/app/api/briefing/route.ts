import { NextResponse } from "next/server";
import { buildDailyBriefing } from "@/lib/briefing/build-briefing";
import { requireFirmApi } from "@/lib/firms/context";
import { serverError } from "@/lib/http/json";

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ briefing: await buildDailyBriefing(ctx.firm) });
  } catch (error) {
    return serverError("api.briefing.failed", error);
  }
}
