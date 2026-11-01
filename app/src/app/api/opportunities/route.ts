import { NextRequest, NextResponse } from "next/server";
import { listHotOpportunities, listOpportunities } from "@/lib/db/opportunities";
import { requireFirmApi } from "@/lib/firms/context";
import { serverError } from "@/lib/http/json";

export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100);
    const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);
    const hotOnly = params.get("hot") === "true";
    const source = params.get("source") ?? undefined;
    const naics = params.get("naics") ?? undefined;
    const q = params.get("q") ?? undefined;

    if (hotOnly) {
      const hot = await listHotOpportunities(ctx.firm.id, limit);
      return NextResponse.json({ opportunities: hot, count: hot.length, source: "database", hot: true });
    }

    const rows = await listOpportunities({ limit, offset, source, naics, q });
    return NextResponse.json({ opportunities: rows, count: rows.length, source: "database" });
  } catch (error) {
    return serverError("api.opportunities.failed", error, "Opportunity search failed");
  }
}
