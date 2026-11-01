const key = process.env.SAM_GOV_API_KEY;
const base =
  process.env.SAM_ENTITY_API_BASE ??
  "https://api.sam.gov/entity-information/v3/entities";

async function search(params) {
  const u = new URL(base);
  u.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { Accept: "application/json" } });
  const j = await r.json();
  console.log(params, "->", r.status, "total", j.totalRecords);
  for (const e of j.entityData ?? []) {
    const reg = e.entityRegistration;
    console.log(" ", reg?.legalBusinessName, reg?.ueiSAM, reg?.cageCode, reg?.registrationStatus);
  }
}

await search({ ueiSAM: "G1XCPA2ANMC3", includeSections: "entityRegistration,coreData" });
await search({ cageCode: "15RT3", includeSections: "entityRegistration,coreData" });
await search({ q: "DFEAL", includeSections: "entityRegistration", size: "5" });
await search({ legalBusinessName: "DFEAL", includeSections: "entityRegistration", size: "5" });
