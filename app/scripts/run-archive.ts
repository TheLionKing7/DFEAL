/**
 * One-off: manually archive stale/expired opportunities.
 * Usage: npx tsx scripts/run-archive.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

async function main() {
  loadEnvLocal();
  const { archiveStaleOpportunities } = await import("../src/lib/db/archive");
  const result = await archiveStaleOpportunities();
  console.log(`Archived ${result.archivedCount} opportunities.`);
  if (result.archivedIds.length > 0) {
    console.log("IDs:", result.archivedIds.slice(0, 20).join(", "));
    if (result.archivedIds.length > 20) {
      console.log(`... and ${result.archivedIds.length - 20} more.`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});