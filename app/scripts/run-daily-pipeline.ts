/**
 * Run the full daily pipeline (ingest → archive → score every firm → digests).
 * Usage: npm run pipeline            (add -- --no-email to skip digests)
 */
import { loadEnvLocal } from "./_env";

async function main() {
  loadEnvLocal();
  const { runDailyPipeline } = await import("../src/lib/cron/daily-pipeline");
  const result = await runDailyPipeline({ sendEmail: !process.argv.includes("--no-email") });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
