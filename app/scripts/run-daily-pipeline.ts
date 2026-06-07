/**
 * One-off: populate Supabase from SAM.gov + score.
 * Usage: npx tsx scripts/run-daily-pipeline.ts
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
  const { runDailyPipeline } = await import("../src/lib/cron/daily-pipeline");
  const result = await runDailyPipeline();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
