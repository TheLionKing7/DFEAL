import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";
import { listLaneOpportunities } from "@/lib/db/lane-opportunities";
import { requireFirmPage } from "@/lib/firms/context";
import { resolveLane, scopedStates } from "@/lib/firms/lanes";
import { stateName } from "@/lib/firms/states";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string; q?: string; state?: string }>;
}) {
  const params = await searchParams;
  const { firm } = await requireFirmPage();
  const { lane, stateFilter } = resolveLane(firm, params.lane);
  const q = params.q?.trim();
  const requestedState = (params.state ?? stateFilter)?.toUpperCase();
  const scope = scopedStates(firm);
  const stateOptions = lane.id === "state" || lane.id === "local" || lane.id === "education" ? scope : null;
  const state =
    requestedState && (scope === null || scope.includes(requestedState) || stateFilter) ? requestedState : undefined;

  let items: OpportunityCardData[] = [];
  let error: string | null = null;
  try {
    items = await listLaneOpportunities(firm, lane.id, { q, state, limit: 60 });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load opportunities";
  }

  return (
    <PageShell>
      <PageHeader
        title={state ? `${lane.label} · ${stateName(state)}` : lane.label}
        description={lane.description}
      />

      <form className="flex flex-wrap gap-2">
        <input type="hidden" name="lane" value={lane.id} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or agency…"
          className="min-w-[12rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        {stateOptions && stateOptions.length > 1 && (
          <select name="state" defaultValue={state ?? ""} className="rounded-lg border border-border px-3 py-2 text-sm">
            <option value="">All my states</option>
            {stateOptions.map((s) => (
              <option key={s} value={s}>
                {stateName(s)}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <Panel title={`${items.length} results`}>
        <div className="space-y-3">
          {items.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
          {items.length === 0 && !error && (
            <p className="text-sm text-text-muted">
              No open opportunities in this lane right now. New notices are ingested daily; widen your state scope or
              lanes in Firm profile &amp; settings → Workspace.
            </p>
          )}
        </div>
      </Panel>
    </PageShell>
  );
}
