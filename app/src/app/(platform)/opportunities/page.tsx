import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";
import { listHotOpportunities, listOpportunities } from "@/lib/db/opportunities";
import { listConnectorStatus, laneToSledSources } from "@/lib/sled/registry";
import {
  laneToMarketTier,
  OPPORTUNITY_LANES,
  type OpportunityLaneId,
} from "@/shared/opportunity-lanes";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string; q?: string }>;
}) {
  const params = await searchParams;
  const lane = (params.lane ?? "federal") as OpportunityLaneId;
  const q = params.q?.trim();
  const laneMeta = OPPORTUNITY_LANES.find((l) => l.id === lane);

  let items: OpportunityCardData[] = [];
  let notice: string | null = null;
  let error: string | null = null;

  try {
    if (lane === "federal" && !q) {
      const hot = await listHotOpportunities(50);
      if (hot.length > 0) {
        items = hot;
      } else {
        const rows = await listOpportunities({ limit: 50, source: "sam" });
        items = rows.map((o) => ({
          ...o,
          fit_score: null,
          go_no_go: null,
          score_rationale: null,
        }));
      }
    } else if (lane === "federal" && q) {
      const rows = await listOpportunities({ limit: 50, source: "sam", q });
      items = rows.map((o) => ({
        ...o,
        fit_score: null,
        go_no_go: null,
        score_rationale: null,
      }));
    } else if (lane === "grants") {
      notice = "Grants.gov lane is Phase 2 — not yet connected.";
    } else {
      const sources = laneToSledSources(lane);
      const connectors = listConnectorStatus().filter((c) => sources.includes(c.id));
      const live = connectors.filter((c) => c.status === "live");

      if (live.length === 0) {
        notice = `${laneMeta?.label ?? lane}: ${connectors.map((c) => c.description).join(" · ")}. Run /api/cron/ingest-sled after connectors are live.`;
      }

      const rows = await listOpportunities({
        limit: 50,
        source: sources.length === 1 ? sources[0] : undefined,
        marketTier: laneToMarketTier(lane),
        q,
      });

      const filtered =
        sources.length > 1
          ? rows.filter((r) => sources.includes(r.source as (typeof sources)[number]))
          : rows;

      if (filtered.length === 0 && live.length > 0) {
        notice =
          "No ingested opportunities for this lane yet. Trigger POST /api/cron/ingest-sled (or wait for daily cron).";
      }

      items = filtered.map((o) => ({
        ...o,
        fit_score: null,
        go_no_go: null,
        score_rationale: null,
      }));
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load opportunities";
  }

  return (
    <PageShell>
      <PageHeader
        title={laneMeta?.label ?? "Opportunities"}
        description={
          laneMeta?.description ?? "Search and open opportunities in the capture workspace."
        }
      />

      <form className="flex gap-2">
        <input type="hidden" name="lane" value={lane} />
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

      {notice && (
        <p className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-gold">
          {notice}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <Panel title={`${items.length} results`}>
        <div className="space-y-3">
          {items.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
