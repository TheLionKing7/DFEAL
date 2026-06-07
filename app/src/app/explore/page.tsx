import Link from "next/link";
import {
  listHotOpportunities,
  listOpportunities,
} from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { createSamGovClient } from "@/lib/sam-gov/client";
import { normalizeSamOpportunity } from "@/lib/sam-gov/normalize";
import { getDfealNaicsCodes } from "@/config/dfeal-profile";

async function loadExploreData() {
  if (isDatabaseConfigured()) {
    try {
      const hot = await listHotOpportunities(12);
      if (hot.length > 0) {
        return { items: hot, mode: "hot" as const, error: null as string | null };
      }
      const all = await listOpportunities({ limit: 12 });
      return {
        items: all.map((o) => ({ ...o, fit_score: null, go_no_go: null, score_rationale: null })),
        mode: "all" as const,
        error: null as string | null,
      };
    } catch (error) {
      return {
        items: [],
        mode: "error" as const,
        error: error instanceof Error ? error.message : "Database query failed",
      };
    }
  }

  try {
    const client = createSamGovClient();
    const seen = new Set<string>();
    const rows = [];
    for (const ncode of getDfealNaicsCodes().slice(0, 2)) {
      const { rows: batch } = await client.searchOpportunities({
        ncode,
        limit: 10,
      });
      for (const raw of batch) {
        if (seen.has(raw.noticeId)) continue;
        seen.add(raw.noticeId);
        rows.push({
          ...normalizeSamOpportunity(raw),
          fit_score: null,
          go_no_go: null,
          score_rationale: null,
        });
      }
    }
    return { items: rows.slice(0, 12), mode: "live" as const, error: null };
  } catch (error) {
    return {
      items: [],
      mode: "error" as const,
      error: error instanceof Error ? error.message : "Failed to load opportunities",
    };
  }
}

export default async function ExplorePage() {
  const { items, mode, error } = await loadExploreData();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold">Explore</h1>
      <p className="mt-2 text-text-muted">
        {mode === "hot"
          ? "Hot opportunities scored against the DFEAL profile."
          : mode === "all"
            ? "Latest opportunities from Supabase — run the daily cron to populate scores."
            : mode === "live"
              ? "Live SAM.gov preview — add Supabase env vars for persisted data."
              : "Opportunity feed"}
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {items.length === 0 && !error && (
        <div className="mt-8 rounded-xl border border-border bg-bg-surface p-6 text-sm text-text-muted">
          <p>No opportunities in the database yet.</p>
          <p className="mt-2">
            Trigger ingest via cron-job.org:
            <code className="ml-1 rounded bg-black/5 px-1.5 py-0.5">
              POST /api/cron/daily-opportunities
            </code>
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {items.map((opp) => (
          <article
            key={opp.id}
            className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-medium leading-snug">{opp.title}</h2>
              <div className="flex flex-wrap gap-2">
                {opp.fit_score != null && (
                  <span className="rounded bg-sidebar px-2 py-0.5 text-xs font-medium text-white">
                    Score {opp.fit_score}
                  </span>
                )}
                {opp.go_no_go && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                      opp.go_no_go === "go"
                        ? "bg-success/15 text-success"
                        : opp.go_no_go === "no_go"
                          ? "bg-error/15 text-error"
                          : "bg-gold/15 text-gold"
                    }`}
                  >
                    {opp.go_no_go.replace("_", " ")}
                  </span>
                )}
                {opp.naics && (
                  <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                    NAICS {opp.naics}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {opp.agency_name ?? "Agency TBD"}
              {opp.set_aside ? ` · ${opp.set_aside}` : ""}
              {opp.response_deadline
                ? ` · Due ${new Date(opp.response_deadline).toLocaleDateString()}`
                : ""}
            </p>
            {opp.score_rationale && (
              <p className="mt-2 text-xs text-text-muted">{opp.score_rationale}</p>
            )}
            {opp.sam_url && (
              <Link
                href={opp.sam_url}
                target="_blank"
                className="mt-3 inline-block text-sm font-medium text-gold hover:underline"
              >
                Open on SAM.gov →
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
