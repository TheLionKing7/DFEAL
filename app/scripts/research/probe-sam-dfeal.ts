import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
}

async function q(label: string, params: Record<string, string>) {
  const key = process.env.SAM_GOV_API_KEY!;
  const base =
    process.env.SAM_ENTITY_API_BASE ?? "https://api.sam.gov/entity-information/v3/entities";
  const url = new URL(base);
  url.searchParams.set("api_key", key);
  url.searchParams.set("includeSections", "entityRegistration,coreData");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const r = await fetch(url, { signal: controller.signal });
    const j = (await r.json()) as {
      totalRecords?: number;
      entityData?: { entityRegistration?: Record<string, string> }[];
    };
    console.log(`--- ${label} status ${r.status} total ${j.totalRecords ?? 0}`);
    for (const e of (j.entityData ?? []).slice(0, 5)) {
      const reg = e.entityRegistration ?? {};
      console.log(
        [
          reg.legalBusinessName,
          reg.ueiSAM,
          reg.cageCode,
          reg.registrationStatus,
          reg.registrationExpirationDate,
        ].join(" | "),
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  loadEnvLocal();
  await q("UEI G1XCPA2ANMC3", { ueiSAM: "G1XCPA2ANMC3" });
  await q("CAGE 15RT3", { cageCode: "15RT3" });
  await q("Name DFEAL LLC", { legalBusinessName: "DFEAL LLC", size: "10" });
  await q("Name DFEAL", { legalBusinessName: "DFEAL", size: "10" });
}

main().catch(console.error);
