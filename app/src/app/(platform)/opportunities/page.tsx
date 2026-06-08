import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";
import { listHotOpportunities, listOpportunities } from "@/lib/db/opportunities";
import { laneToMarketTier, laneToSource, type OpportunityLaneId } from "@/shared/opportunity-lanes";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string; q?: string }>;
}) {
  const params = await searchParams;
  const lane = (params.lane ?? "federal") as OpportunityLaneId;
  const q = params.q?.trim();

  let items: OpportunityCardData[] = [];
  let error: string | null = null;

  try {
    if (lane === "federal" && !q) {
      const hot = await listHotOpportunities(50);
      items = hot.length > 0 ? hot : await listOpportunities({ limit: 50, source: "sam" }).then(
        (rows) =>
          rows.map((o) => ({
            ...o,
            fit_score: null,
            go_no_go: null,
            score_rationale: null,
            scored_at: null,
          })),
      );
    } else if (lane !== "federal") {
      items = [];
      error = `${lane} lane connectors are Phase 3 — federal SAM data is available now.`;
    } else {
      const rows = await listOpportunities({
        limit: 50,
        source: laneToSource(lane),
        marketTier: laneToMarketTier(lane),
        q,
      });
      items = rows.map((o) => ({
        ...o,
        fit_score: null,
        go_no_go: null,
        score_rationale: null,
        scored_at: null,
      }));
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load opportunities";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opportunities</h1>
        <p className="mt-2 text-text-muted">
          Search and open any opportunity in the capture workspace.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or agency…"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold">
          {error}
        </p>
      )}

      <p className="text-sm text-text-muted">{items.length} results</p>

      <div className="space-y-3">
        {items.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>
    </div>
  );
}
