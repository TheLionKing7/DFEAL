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
  samRegistered?: string;
}

interface NaicsEntry {
  naicsCode?: string;
  naicsDescription?: string;
  naicsInformation?: { naicsCode?: string };
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
  message?: string;
  detail?: string;
  title?: string;
}

function mapRecordToSamEntity(
  record: EntityRecord,
  fallback?: { uei?: string; cage?: string },
): SamEntity | null {
  if (!record.entityRegistration) return null;

  const reg = record.entityRegistration;
  const core = record.coreData;

  const naicsFromList =
    core?.naicsList
      ?.map((n) => n.naicsCode ?? n.naicsInformation?.naicsCode)
      .filter(Boolean) as string[] | undefined;

  return {
    uei: reg.ueiSAM ?? fallback?.uei ?? "",
    cage: reg.cageCode ?? fallback?.cage ?? null,
    legal_name: reg.legalBusinessName ?? "Unknown",
    dba_name: reg.dbaName ?? null,
    registration_status: mapSamRegistrationStatus(reg.registrationStatus),
    expiration_date: reg.registrationExpirationDate ?? null,
    naics_codes: naicsFromList ?? [],
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

async function fetchSamEntityResponse(url: URL): Promise<EntityResponse> {
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const bodyText = await res.text();

  if (res.status === 404) {
    return { entityData: [], totalRecords: 0 };
  }

  let data: EntityResponse;
  try {
    data = JSON.parse(bodyText) as EntityResponse;
  } catch {
    throw new Error(
      `SAM entity lookup returned invalid JSON (${res.status}). Check SAM_GOV_API_KEY and Entity API access.`,
    );
  }

  if (!res.ok) {
    const message =
      data.message ??
      data.detail ??
      data.title ??
      `SAM entity lookup failed (${res.status})`;
    if (res.status === 403) {
      throw new Error(
        `${message} — your API key may not include Entity Management access. Request Entity API access at SAM.gov.`,
      );
    }
    throw new Error(message);
  }

  return data;
}

function baseEntityUrl(): URL {
  const url = new URL(getSamEntityUrl());
  url.searchParams.set("api_key", getSamApiKey());
  url.searchParams.set("includeSections", "entityRegistration,coreData");
  return url;
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

  const url = baseEntityUrl();
  if (uei) {
    url.searchParams.set("ueiSAM", uei);
  } else if (cage) {
    url.searchParams.set("cageCode", cage);
  }

  const data = await fetchSamEntityResponse(url);
  const record = data.entityData?.[0] ?? null;
  if (!record) return null;

  return mapRecordToSamEntity(record, { uei, cage });
}

export async function searchSamEntities(options: {
  name: string;
  limit?: number;
}): Promise<SamEntity[]> {
  const name = options.name.trim();
  if (name.length < 2) {
    throw new Error("Search name must be at least 2 characters");
  }

  const url = baseEntityUrl();
  url.searchParams.set("legalBusinessName", name);
  url.searchParams.set("size", String(Math.min(options.limit ?? 10, 10)));

  const data = await fetchSamEntityResponse(url);
  return (data.entityData ?? [])
    .map((record) => mapRecordToSamEntity(record))
    .filter((e): e is SamEntity => Boolean(e));
}
