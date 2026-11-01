/**
 * Ingest SAM + SLED + grants for the union of all firms' NAICS/keywords, then re-score every firm.
 * Usage: npm run ingest
 */
import { loadEnvLocal } from "./_env";

async function main() {
  loadEnvLocal();
  const { loadIngestProfile } = await import("../src/lib/firms/ingest-profile");
  const profile = await loadIngestProfile();
  console.log(`Firms: ${profile.firms.map((f) => f.slug).join(", ") || "(none)"}`);
  console.log(`NAICS: ${profile.naicsCodes.join(", ")}`);

  const { ingestSamOpportunities } = await import("../src/lib/ingest/sam-ingest");
  console.log("SAM:", await ingestSamOpportunities(30, profile.naicsCodes));

  const { ingestAllEnabledSled } = await import("../src/lib/ingest/sled-ingest");
  console.log("SLED:", JSON.stringify(await ingestAllEnabledSled(30, profile.keywords), null, 2));

  const { ingestAllEnabledGrants } = await import("../src/lib/ingest/grants-ingest");
  console.log("Grants:", JSON.stringify(await ingestAllEnabledGrants(120, profile.keywords), null, 2));

  const { runScoringOnly } = await import("../src/lib/cron/daily-pipeline");
  console.log("Scoring:", await runScoringOnly());
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
