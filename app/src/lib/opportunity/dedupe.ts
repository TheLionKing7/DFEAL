import type { HotOpportunity } from "@/lib/db/database.types";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";

function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deadlineDay(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * Collapse duplicate notices that look the same in the UI (same title/deadline/agency).
 * SAM often stores these as separate rows with different notice IDs and content hashes.
 */
export function opportunityDedupeKey(input: {
  id: string;
  title: string;
  response_deadline?: string | null;
  agency_name?: string | null;
  naics?: string | null;
}): string {
  return [
    normalizeTitle(input.title),
    deadlineDay(input.response_deadline),
    (input.agency_name ?? "").trim().toLowerCase(),
    input.naics ?? "",
  ].join("|");
}

export function dedupeHotOpportunityRows<T extends HotOpportunity>(rows: T[]): T[] {
  const seen = new Map<string, T>();
  for (const row of rows) {
    const key = opportunityDedupeKey({
      id: row.id,
      title: row.title,
      response_deadline: row.response_deadline,
      agency_name: row.agency_name,
      naics: row.naics,
    });
    const existing = seen.get(key);
    if (!existing || row.fit_score > existing.fit_score) {
      seen.set(key, row);
    }
  }
  return [...seen.values()];
}

export function dedupeOpportunityCards<T extends OpportunityCardData>(
  items: T[],
): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const key = opportunityDedupeKey(item);
    const existing = seen.get(key);
    if (!existing || (item.fit_score ?? 0) > (existing.fit_score ?? 0)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}
