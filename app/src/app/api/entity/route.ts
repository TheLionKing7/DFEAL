import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { lookupSamEntity, searchSamEntities } from "@/lib/sam-gov/entity";
import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import type { SamEntity } from "@/shared/types/entity";

function profileFallbackEntity(uei?: string, cage?: string): SamEntity | null {
  const ueiMatch = uei?.toUpperCase() === DFEAL_PROFILE.uei.toUpperCase();
  const cageMatch = cage?.toUpperCase() === DFEAL_PROFILE.cage.toUpperCase();
  if (!ueiMatch && !cageMatch) return null;

  return {
    uei: DFEAL_PROFILE.uei,
    cage: DFEAL_PROFILE.cage,
    legal_name: DFEAL_PROFILE.legalName,
    dba_name: null,
    registration_status: DFEAL_PROFILE.samStatus,
    expiration_date: DFEAL_PROFILE.samExpirationDate,
    naics_codes: [DFEAL_PROFILE.primaryNaics, ...DFEAL_PROFILE.secondaryNaics],
    psc_codes: DFEAL_PROFILE.pscCodes,
    physical_address: { state: "IL", city: "Chicago area" },
    fetched_at: new Date().toISOString(),
    raw_data: {
      source: "dfeal_profile_fallback",
      note: "SAM.gov returned no match for this UEI/CAGE — showing on-file company profile. Verify registration at sam.gov.",
    },
  };
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const fallback = profileFallbackEntity(uei, cage);
    if (fallback) {
      return NextResponse.json({
        entity: fallback,
        source: "profile_fallback",
        notice:
          "SAM.gov has no active record for this UEI/CAGE. Showing DFEAL profile on file — confirm registration status at sam.gov.",
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
