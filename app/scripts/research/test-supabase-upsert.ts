import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const lines = readFileSync(resolve(".env.local"), "utf8").split("\n");
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const { error } = await sb.from("opportunities").upsert(
  {
    id: "test-upsert-check",
    source: "sam",
    external_id: "test-upsert-check",
    market_tier: "federal",
    notice_type: "solicitation",
    title: "Test",
    description: null,
    agency_id: null,
    agency_name: "Test",
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: null,
    estimated_value_usd: null,
    response_deadline: null,
    posted_date: null,
    status: "active",
    sam_url: null,
    source_url: null,
    raw_json: {},
    content_hash: "abc",
  },
  { onConflict: "source,external_id" },
);

console.log("upsert error:", error);
await sb.from("opportunities").delete().eq("external_id", "test-upsert-check");
console.log("done");
