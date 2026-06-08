import type { Opportunity } from "@/shared/types/opportunity";

export type OpportunityCategory =
  | "contract_opportunity"
  | "industry_event"
  | "award_notice"
  | "administrative";

export interface OpportunityClassification {
  category: OpportunityCategory;
  label: string;
  isPursuable: boolean;
  reason: string;
}

const EVENT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /industry\s+day/i, label: "Industry day" },
  { pattern: /vendor\s+day/i, label: "Vendor day" },
  { pattern: /pre-?proposal\s+conference/i, label: "Pre-proposal conference" },
  { pattern: /pre-?bid\s+conference/i, label: "Pre-bid conference" },
  { pattern: /site\s+visit/i, label: "Site visit" },
  { pattern: /webinar/i, label: "Webinar" },
  { pattern: /virtual\s+meeting/i, label: "Virtual meeting" },
  { pattern: /public\s+meeting/i, label: "Public meeting" },
  { pattern: /town\s+hall/i, label: "Town hall" },
  { pattern: /listening\s+session/i, label: "Listening session" },
  { pattern: /networking\s+event/i, label: "Networking event" },
  { pattern: /questions?\s+and\s+answers?\s+session/i, label: "Q&A session" },
  { pattern: /\bq\s*&\s*a\s+session\b/i, label: "Q&A session" },
  { pattern: /registration\s+open.*(event|conference|summit)/i, label: "Event registration" },
  { pattern: /(conference|symposium|expo|summit)\s+registration/i, label: "Conference" },
  { pattern: /\bconference\b.*\b(attend|register|invitation)\b/i, label: "Conference invitation" },
  { pattern: /invitation\s+to\s+(attend|participate)/i, label: "Event invitation" },
];

const AWARD_PATTERNS = [
  /award\s+notice/i,
  /contract\s+award/i,
  /intent\s+to\s+award/i,
  /notice\s+of\s+award/i,
  /award\s+in\s+process/i,
];

const ADMIN_PATTERNS = [
  /change\s+order\s+notice/i,
  /lease\s+award/i,
  /notice\s+of\s+lease/i,
  /sole\s+source\s+justification/i,
];

function haystack(opp: Opportunity): string {
  return [opp.title, opp.description ?? "", opp.notice_type, opp.agency_name ?? ""]
    .join(" ")
    .toLowerCase();
}

export function classifyOpportunity(opp: Opportunity): OpportunityClassification {
  const text = haystack(opp);

  if (opp.raw_data?.funding_type === "sba_event") {
    return {
      category: "industry_event",
      label: "SBA event",
      isPursuable: false,
      reason: "SBA business development event — not a contract or grant solicitation",
    };
  }

  if (opp.notice_type === "award") {
    return {
      category: "award_notice",
      label: "Award notice",
      isPursuable: false,
      reason: "Award notice — not an open solicitation",
    };
  }

  for (const { pattern, label } of EVENT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        category: "industry_event",
        label,
        isPursuable: false,
        reason: `${label} — informational event, not a contract opportunity`,
      };
    }
  }

  if (AWARD_PATTERNS.some((p) => p.test(text))) {
    return {
      category: "award_notice",
      label: "Award notice",
      isPursuable: false,
      reason: "Award or intent-to-award — not pursuable",
    };
  }

  if (ADMIN_PATTERNS.some((p) => p.test(text)) && !/rfp|rfq|ifb|solicitation/i.test(text)) {
    return {
      category: "administrative",
      label: "Administrative notice",
      isPursuable: false,
      reason: "Administrative or post-award notice",
    };
  }

  return {
    category: "contract_opportunity",
    label: "Contract opportunity",
    isPursuable: true,
    reason: "Active solicitation or market research opportunity",
  };
}

export function isContractOpportunity(opp: Opportunity): boolean {
  return classifyOpportunity(opp).isPursuable;
}
