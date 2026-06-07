import { NextRequest, NextResponse } from "next/server";
import {
  listHotOpportunities,
  listOpportunities,
} from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { createSamGovClient } from "@/lib/sam-gov/client";
import { normalizeSamOpportunity } from "@/lib/sam-gov/normalize";
import { getDfealNaicsCodes } from "@/config/dfeal-profile";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Number(params.get("limit") ?? 25), 100);
    const offset = Number(params.get("offset") ?? 0);
    const hotOnly = params.get("hot") === "true";
    const source = params.get("source") ?? undefined;
    const naics = params.get("naics") ?? undefined;

    if (isDatabaseConfigured()) {
      if (hotOnly) {
        const hot = await listHotOpportunities(limit);
        return NextResponse.json({
          opportunities: hot,
          count: hot.length,
          source: "database",
          hot: true,
        });
      }

      const rows = await listOpportunities({ limit, offset, source, naics });
      return NextResponse.json({
        opportunities: rows,
        count: rows.length,
        source: "database",
      });
    }

    const naicsCodes = naics
      ? naics.split(",").map((c) => c.trim()).filter(Boolean)
      : getDfealNaicsCodes();

    const client = createSamGovClient();
    const merged = [];
    const seen = new Set<string>();

    for (const ncode of naicsCodes) {
      const { rows: batch } = await client.searchOpportunities({
        ncode,
        limit,
        offset,
      });
      for (const raw of batch) {
        if (seen.has(raw.noticeId)) continue;
        seen.add(raw.noticeId);
        merged.push(normalizeSamOpportunity(raw));
      }
    }

    return NextResponse.json({
      opportunities: merged.slice(0, limit),
      count: merged.length,
      source: "sam_live",
      naics_filter: naicsCodes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Opportunity search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
