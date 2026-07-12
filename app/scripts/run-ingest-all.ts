/**
 * Run SAM + SLED + grants ingest and re-score active opportunities.
 * Usage: npx tsx scripts/run-ingest-all.ts
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

  console.log("Starting SAM ingest...");
  const { ingestSamOpportunities } = await import("../src/lib/ingest/sam-ingest");
  const sam = await ingestSamOpportunities(30);
  console.log("SAM:", sam);

  console.log("Starting SLED ingest...");
  const { ingestAllEnabledSled } = await import("../src/lib/ingest/sled-ingest");
  const sled = await ingestAllEnabledSled(30);
  console.log("SLED:", JSON.stringify(sled, null, 2));

  console.log("Starting grants ingest...");
  const { ingestAllEnabledGrants } = await import("../src/lib/ingest/grants-ingest");
  const grants = await ingestAllEnabledGrants(120);
  console.log("Grants:", JSON.stringify(grants, null, 2));

  console.log("Re-scoring active opportunities...");
  const { runScoringOnly } = await import("../src/lib/cron/daily-pipeline");
  const scored = await runScoringOnly(200, true);
  console.log("Scoring:", scored);

  console.log("Ingest complete.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
