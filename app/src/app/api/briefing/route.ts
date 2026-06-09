import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { buildDailyBriefing } from "@/lib/briefing/build-briefing";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const briefing = await buildDailyBriefing();
  return NextResponse.json({ briefing });
}
