import Link from "next/link";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import {
  listHotOpportunities,
  listOpportunities,
} from "@/lib/db/opportunities";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { createSamGovClient } from "@/lib/sam-gov/client";
import { normalizeSamOpportunity } from "@/lib/sam-gov/normalize";
import { getDfealNaicsCodes } from "@/config/dfeal-profile";

export const dynamic = "force-dynamic";

async function loadExploreData() {
  if (isDatabaseConfigured()) {
    try {
      const hot = await listHotOpportunities(12);
      if (hot.length > 0) {
        return { items: hot, mode: "hot" as const, error: null as string | null };
      }
      const all = await listOpportunities({ limit: 12 });
      return {
        items: all.map((o) => ({
          ...o,
          fit_score: null,
          go_no_go: null,
          score_rationale: null,
        })),
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
      const { rows: batch } = await client.searchOpportunities({ ncode, limit: 10 });
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Explore</h1>
          <p className="mt-2 text-text-muted">
            {mode === "hot"
              ? "Hot opportunities scored against the DFEAL profile."
              : mode === "all"
                ? "Latest opportunities — run daily cron to populate scores."
                : mode === "live"
                  ? "Live SAM.gov preview."
                  : "Opportunity feed"}
          </p>
        </div>
        <Link
          href="/opportunities"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-gold/40"
        >
          Browse all →
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink href="/watchlist" title="Pursuits" desc="Track bid pipeline" />
        <QuickLink href="/documents" title="Documents" desc="Proposal drafts" />
        <QuickLink href="/entity" title="SAM entity" desc="Verify registration" />
      </div>

      <div className="space-y-3">
        {items.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-bg-surface p-4 hover:border-gold/30"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{desc}</p>
    </Link>
  );
}
