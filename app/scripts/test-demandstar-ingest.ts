/**
 * Test DemandStar ingest with DB upsert.
 * Usage: npx tsx scripts/test-demandstar-ingest.ts --upsert
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash > 0) value = value.slice(0, hash).trim();
    process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const upsert = process.argv.includes("--upsert");

  if (upsert) {
    console.log("Running DemandStar ingest (DB upsert)...");
    const { ingestSledOpportunities } = await import("../src/lib/ingest/sled-ingest");
    const result = await ingestSledOpportunities({ sources: ["demandstar"], daysBack: 30 });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("Testing DemandStar fetch (limit 20)...");
  const { fetchDemandStarOpportunities } = await import("../src/lib/sled/demandstar");
  const result = await fetchDemandStarOpportunities({ limit: 20 });

  console.log(
    JSON.stringify(
      {
        source: result.source,
        fetched: result.fetched,
        message: result.message,
        sample: result.opportunities.slice(0, 5).map((o) => ({
          title: o.title,
          agency: o.agency_name,
          state: o.place_of_performance?.state ?? null,
          deadline: o.response_deadline,
          url: o.source_url,
        })),
      },
      null,
      2,
    ),
  );

  if (result.fetched === 0 && result.message && /failed|error|login/i.test(result.message)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
