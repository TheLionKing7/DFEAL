/**
 * Onboard a firm from a JSON file (headless alternative to /onboarding).
 *
 *   npm run firm:onboard -- path/to/firm.json owner@firm.com
 *
 * The JSON uses the same fields as the onboarding form, e.g.
 *   {
 *     "legalName": "Acme Federal LLC",
 *     "industry": "it_services",
 *     "primaryNaics": "541512",
 *     "naicsCodes": ["541511", "541519"],
 *     "keywords": ["cloud", "cybersecurity"],
 *     "setAsides": ["SDVOSB"],
 *     "homeState": "VA",
 *     "allowedEmailDomains": ["acmefederal.com"]
 *   }
 * See supabase/seed/example-firm.json for a full example.
 */
import { readFileSync } from "node:fs";
import { loadEnvLocal } from "./_env";

async function main() {
  loadEnvLocal();
  const [file, ownerEmail] = process.argv.slice(2);
  if (!file) throw new Error("Usage: npm run firm:onboard -- <firm.json> [owner-email]");

  const { firmInputSchema, formatValidationErrors, slugify } = await import("../src/lib/firms/validation");
  const { createFirm, getFirmBySlug } = await import("../src/lib/firms/repository");
  const { rescoreFirm } = await import("../src/lib/firms/service");

  const parsed = firmInputSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error("Validation failed:", formatValidationErrors(parsed.error));
    process.exit(1);
  }

  const base = parsed.data.slug ?? slugify(parsed.data.legalName);
  let slug = base;
  for (let i = 2; await getFirmBySlug(slug); i += 1) slug = `${base}-${i}`;

  const firm = await createFirm({ ...parsed.data, slug }, "cli", ownerEmail ? { email: ownerEmail } : undefined);
  console.log(`Created firm ${firm.legalName} (${firm.slug}, ${firm.id})`);
  const scored = await rescoreFirm(firm.id);
  console.log(`Scored ${scored?.scored ?? 0} opportunities (${scored?.hot_count ?? 0} hot).`);
  if (ownerEmail) console.log(`Owner: ${ownerEmail} — they can sign in with a magic link.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
