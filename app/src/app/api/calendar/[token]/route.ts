import { NextRequest, NextResponse } from "next/server";
import { buildFirmCalendar } from "@/lib/connectors/ics";
import { findCalendarFeed } from "@/lib/connectors/store";
import { getFirmById } from "@/lib/firms/repository";

/** Public, token-authenticated ICS feed (calendar apps can't send cookies). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const feed = await findCalendarFeed(token.replace(/\.ics$/, ""));
  if (!feed) return new NextResponse("Not found", { status: 404 });
  const firm = await getFirmById(feed.firmId);
  if (!firm || firm.status !== "active") return new NextResponse("Not found", { status: 404 });
  const body = await buildFirmCalendar(firm.id, firm.legalName);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${firm.slug}-deadlines.ics"`,
      "Cache-Control": "private, max-age=900",
    },
  });
}
