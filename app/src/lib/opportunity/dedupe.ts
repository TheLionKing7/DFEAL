import type { HotOpportunity } from "@/lib/db/database.types";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable key for collapsing duplicate notices (same solicitation, different notice IDs). */
export function opportunityDedupeKey(input: {
  id: string;
  title: string;
  response_deadline?: string | null;
  agency_name?: string | null;
  content_hash?: string | null;
  sam_url?: string | null;
}): string {
  if (input.content_hash) return `hash:${input.content_hash}`;
  const link = input.sam_url?.trim();
  if (link) return `url:${link}`;
  return `title:${normalizeTitle(input.title)}|${input.response_deadline ?? ""}|${(input.agency_name ?? "").trim().toLowerCase()}`;
}

export function dedupeHotOpportunityRows<T extends HotOpportunity>(rows: T[]): T[] {
  const seen = new Map<string, T>();
  for (const row of rows) {
    const key = opportunityDedupeKey({
      id: row.id,
      title: row.title,
      response_deadline: row.response_deadline,
      agency_name: row.agency_name,
      content_hash: row.content_hash,
      sam_url: row.sam_url ?? row.source_url,
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
