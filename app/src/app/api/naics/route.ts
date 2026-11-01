import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firms/context";
import { getNaics, searchNaics } from "@/lib/naics";

/** NAICS 2022 lookup for the onboarding / profile forms. */
export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const codes = request.nextUrl.searchParams.get("codes");
  if (codes) {
    return NextResponse.json({
      results: codes.split(",").map((c) => getNaics(c.trim())).filter(Boolean),
    });
  }
  return NextResponse.json(
    { results: searchNaics(q.slice(0, 80), 30) },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
