import {
  getSamApiKey,
  getSamEntityUrl,
  mapSamRegistrationStatus,
} from "@/lib/env";
import type { SamEntity } from "@/shared/types/entity";

interface EntityRegistration {
  ueiSAM?: string;
  cageCode?: string;
  legalBusinessName?: string;
  dbaName?: string;
  registrationStatus?: string;
  registrationExpirationDate?: string;
}

interface NaicsEntry {
  naicsCode?: string;
  naicsDescription?: string;
}

interface EntityRecord {
  entityRegistration?: EntityRegistration;
  coreData?: {
    entityInformation?: { entityURL?: string };
    physicalAddress?: {
      cityName?: string;
      stateOrProvinceCode?: string;
      zipCode?: string;
    };
    naicsList?: NaicsEntry[];
    pscList?: { pscCode?: string }[];
  };
}

interface EntityResponse {
  entityData?: EntityRecord[];
  totalRecords?: number;
}

function pickEntityRecord(data: EntityResponse): EntityRecord | null {
  return data.entityData?.[0] ?? null;
}

export async function lookupSamEntity(options: {
  uei?: string;
  cage?: string;
}): Promise<SamEntity | null> {
  const uei = options.uei?.trim();
  const cage = options.cage?.trim();
  if (!uei && !cage) {
    throw new Error("Provide uei or cage");
  }

  const url = new URL(getSamEntityUrl());
  url.searchParams.set("api_key", getSamApiKey());
  if (uei) url.searchParams.set("ueiSAM", uei);
  if (cage) url.searchParams.set("cageCode", cage);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SAM entity lookup failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as EntityResponse;
  const record = pickEntityRecord(data);
  if (!record?.entityRegistration) return null;

  const reg = record.entityRegistration;
  const core = record.coreData;

  return {
    uei: reg.ueiSAM ?? uei ?? "",
    cage: reg.cageCode ?? cage ?? null,
    legal_name: reg.legalBusinessName ?? "Unknown",
    dba_name: reg.dbaName ?? null,
    registration_status: mapSamRegistrationStatus(reg.registrationStatus),
    expiration_date: reg.registrationExpirationDate ?? null,
    naics_codes:
      core?.naicsList?.map((n) => n.naicsCode).filter(Boolean) as string[] ??
      [],
    psc_codes:
      core?.pscList?.map((p) => p.pscCode).filter(Boolean) as string[] ?? [],
    physical_address: core?.physicalAddress
      ? {
          city: core.physicalAddress.cityName,
          state: core.physicalAddress.stateOrProvinceCode,
          zip: core.physicalAddress.zipCode,
        }
      : null,
    fetched_at: new Date().toISOString(),
    raw_data: record as Record<string, unknown>,
  };
}
