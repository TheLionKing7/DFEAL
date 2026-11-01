import { NextRequest, NextResponse } from "next/server";
import { requireFirmApi } from "@/lib/firms/context";
import type { FirmProfile } from "@/lib/firms/types";
import { lookupSamEntity, searchSamEntities } from "@/lib/sam-gov/entity";
import type { SamEntity } from "@/shared/types/entity";

function profileFallbackEntity(firm: FirmProfile, uei?: string, cage?: string): SamEntity | null {
  const ueiMatch = Boolean(firm.uei && uei?.toUpperCase() === firm.uei.toUpperCase());
  const cageMatch = Boolean(firm.cage && cage?.toUpperCase() === firm.cage.toUpperCase());
  if (!ueiMatch && !cageMatch) return null;

  return {
    uei: firm.uei ?? "",
    cage: firm.cage,
    legal_name: firm.legalName,
    dba_name: null,
    registration_status: firm.samStatus,
    expiration_date: firm.samExpirationDate,
    naics_codes: firm.naicsCodes,
    psc_codes: firm.pscCodes,
    physical_address: firm.homeState ? { state: firm.homeState } : null,
    fetched_at: new Date().toISOString(),
    raw_data: {
      source: "firm_profile_fallback",
      note: "SAM.gov returned no match for this UEI/CAGE — showing on-file company profile. Verify registration at sam.gov.",
    },
  };
}

export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const uei = request.nextUrl.searchParams.get("uei") ?? undefined;
    const cage = request.nextUrl.searchParams.get("cage") ?? undefined;
    const name =
      request.nextUrl.searchParams.get("name") ??
      request.nextUrl.searchParams.get("q") ??
      undefined;

    if (name?.trim()) {
      const entities = await searchSamEntities({ name: name.trim() });
      return NextResponse.json({ entities, source: "sam_search" });
    }

    if (!uei && !cage) {
      return NextResponse.json(
        { error: "Provide uei, cage, or name to search" },
        { status: 400 },
      );
    }

    const entity = await lookupSamEntity({ uei, cage });
    if (entity) {
      return NextResponse.json({ entity, source: "sam" });
    }

    const fallback = profileFallbackEntity(ctx.firm, uei, cage);
    if (fallback) {
      let suggestions: SamEntity[] = [];
      try {
        suggestions = await searchSamEntities({ name: ctx.firm.legalName });
      } catch {
        /* optional */
      }

      return NextResponse.json({
        entity: fallback,
        source: "profile_fallback",
        suggestions,
        notice:
          "SAM.gov returned no record for this UEI/CAGE. The card below is your on-file company profile only — not live SAM data. Search by legal name or confirm your registration at sam.gov, then update the UEI/CAGE in Settings.",
      });
    }

    return NextResponse.json(
      {
        error:
          "No entity found in SAM.gov for that UEI or CAGE. Try searching by legal business name instead.",
      },
      { status: 404 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Entity lookup failed";
    const isConfig = message.includes("Missing required environment variable");
    return NextResponse.json(
      {
        error: isConfig
          ? "SAM_GOV_API_KEY is not configured on this server. Add it in Vercel env vars."
          : message,
      },
      { status: isConfig ? 503 : 500 },
    );
  }
}
