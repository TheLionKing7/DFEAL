import type { Opportunity, OpportunitySource } from "@/shared/types/opportunity";

export function sledOpportunityId(source: OpportunitySource, externalId: string): string {
  return `${source}-${externalId.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

export function parseSledDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Parse Georgia GPR date strings like "Jun 08, 2026 @ 08:00 AM" */
export function parseGeorgiaDateString(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const cleaned = value.replace("@", "").trim();
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function governmentTypeToMarketTier(
  governmentType: string | null | undefined,
): "state" | "local" | "education" {
  const t = (governmentType ?? "").toLowerCase();
  if (t.includes("k-12") || t.includes("school") || t.includes("education")) {
    return "education";
  }
  if (t.includes("city") || t.includes("municipal") || t.includes("county")) {
    return "local";
  }
  return "state";
}

const DFEAL_SLED_KEYWORDS = [
  "consult",
  "management",
  "advisory",
  "professional",
  "it ",
  "information technology",
  "software",
  "training",
  "engineering",
  "grant",
  "administration",
  "staffing",
  "services",
  "procurement",
  "logistics",
];

export function matchesDfealSledKeywords(title: string, description?: string | null): boolean {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  return DFEAL_SLED_KEYWORDS.some((kw) => haystack.includes(kw));
}
