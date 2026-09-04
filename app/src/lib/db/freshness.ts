/**
 * Opportunity freshness policy.
 *
 * The platform surfaces only "fresh" opportunities: deals whose response
 * deadline is in the future, or that closed within a short grace window.
 * Anything expired beyond that window is considered stale and archived.
 *
 * A single constant drives both the read-side filter (below) and the
 * `archive_stale_opportunities()` SQL function so the two stay in sync.
 */

/** Days of grace after a deadline before an opportunity is treated as stale. */
export const OPPORTUNITY_FRESHNESS_DAYS = 7;

/** ISO timestamp (UTC) of the freshness cutoff: now minus the grace window. */
export function freshnessCutoffIso(now: Date = new Date()): string {
  return new Date(
    now.getTime() - OPPORTUNITY_FRESHNESS_DAYS * 86_400_000,
  ).toISOString();
}

/**
 * PostgREST `.or()` filter that keeps only fresh opportunities:
 *   - no response deadline set (undated), OR
 *   - deadline has not passed by more than the grace window.
 */
export function freshnessOrFilter(now: Date = new Date()): string {
  return `response_deadline.is.null,response_deadline.gte.${freshnessCutoffIso(now)}`;
}

/**
 * AND-combine two OR-group filters into a single `or=` string (DNF form),
 * so `combineOrFilters(search, freshness)` means `search AND freshness`.
 */
export function combineOrFilters(a: string, b: string): string {
  const left = a
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const right = b
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const l of left) {
    for (const r of right) {
      out.push(`and(${l},${r})`);
    }
  }
  return out.join(",");
}
