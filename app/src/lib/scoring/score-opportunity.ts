import type { FirmProfile } from "@/lib/firms/types";
import {
  classifyOpportunity,
  type OpportunityCategory,
} from "@/lib/opportunity/classify";
import type { Opportunity } from "@/shared/types/opportunity";

export interface ScoreResult {
  fit_score: number;
  go_no_go: "go" | "no_go" | "review";
  rationale: string;
  category: OpportunityCategory;
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function matchesSetAside(setAside: string | null, preferred: string[]): boolean {
  if (!setAside) return preferred.some((p) => /none|unrestricted/i.test(p));
  const lower = setAside.toLowerCase();
  return preferred.some((p) => {
    if (/none|unrestricted/i.test(p)) {
      return /full and open|unrestricted|none/i.test(lower);
    }
    return lower.includes(p.toLowerCase().replace(/[()]/g, ""));
  });
}

/** State-specific sources always perform in their state. */
const SOURCE_STATE: Record<string, string> = {
  bidbuy_il: "IL",
  stateuniv_il: "IL",
  education_il: "IL",
  georgia: "GA",
  ohio: "OH",
};

const STATE_NAMES: Record<string, string> = {
  IL: "illinois", GA: "georgia", OH: "ohio", DE: "delaware", MD: "maryland", VA: "virginia",
  TX: "texas", CA: "california", NY: "new york", FL: "florida", PA: "pennsylvania", DC: "district of columbia",
};

export function opportunityState(opp: Opportunity): string | null {
  const fromSource = SOURCE_STATE[opp.source];
  if (fromSource) return fromSource;
  const state = opp.place_of_performance?.state?.trim().toUpperCase();
  return state && state.length === 2 ? state : null;
}

function isInState(opp: Opportunity, state: string): boolean {
  if (opportunityState(opp) === state) return true;
  const name = STATE_NAMES[state];
  return Boolean(name && (opp.agency_name ?? "").toLowerCase().includes(name));
}

function scoreNaics(opp: Opportunity, firm: FirmProfile): { points: number; reason: string } {
  const primary = firm.primaryNaics;
  const firmNaics = firm.naicsCodes;
  const secondary = new Set(firmNaics.filter((c) => c !== primary));

  if (!opp.naics) {
    if (SOURCE_STATE[opp.source]) {
      return { points: 6, reason: "State bid — NAICS not listed on bulletin" };
    }
    if (opp.source === "grants_gov" || opp.source === "sba") {
      return { points: 10, reason: "Grant opportunity — NAICS often not listed; verify eligibility" };
    }
    return { points: 2, reason: "NAICS not listed — verify in solicitation" };
  }

  if (opp.naics === primary) {
    return { points: 38, reason: `Primary NAICS ${opp.naics} match` };
  }
  if (secondary.has(opp.naics)) {
    return { points: 28, reason: `Secondary NAICS ${opp.naics} match` };
  }
  if (opp.naics.slice(0, 4) === primary.slice(0, 4)) {
    return { points: 18, reason: `NAICS ${opp.naics} closely related (4-digit)` };
  }
  if (opp.naics.slice(0, 3) === primary.slice(0, 3)) {
    return { points: 12, reason: `NAICS ${opp.naics} same sector (3-digit)` };
  }
  if ([...secondary].some((n) => opp.naics!.slice(0, 4) === n.slice(0, 4))) {
    return { points: 16, reason: `NAICS ${opp.naics} closely related to secondary code` };
  }
  if (firmNaics.some((n) => opp.naics!.slice(0, 2) === n.slice(0, 2))) {
    return { points: 6, reason: `NAICS ${opp.naics} weak sector overlap` };
  }
  return { points: 0, reason: `NAICS ${opp.naics} outside firm NAICS profile` };
}

function scoreCompetencyRelevance(
  opp: Opportunity,
  firm: FirmProfile,
): { points: number; reason: string } {
  const text = ` ${opp.title} ${opp.description ?? ""} `.toLowerCase();
  const terms = [...new Set([...firm.keywords, ...firm.coreCompetencies].map((t) => t.toLowerCase().trim()))]
    .filter((t) => t.length >= 2);

  let hits = 0;
  const matched: string[] = [];
  for (const term of terms) {
    // Short terms (e.g. "it", "pmo") must match as whole words.
    const hit = term.length <= 4 ? new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text) : text.includes(term);
    if (hit && matched.length < 4) {
      hits += 1;
      matched.push(term.slice(0, 30));
    }
  }

  const points = Math.min(22, hits * 5);
  if (points === 0) {
    return { points: 0, reason: "Low keyword alignment with firm competencies" };
  }
  return {
    points,
    reason: `Competency alignment (${matched.slice(0, 2).join(", ")})`,
  };
}

function scoreDeadline(daysLeft: number | null, minDays: number): { points: number; reason: string } {
  if (daysLeft === null) {
    return { points: 4, reason: "No response deadline listed" };
  }
  if (daysLeft < minDays) {
    return {
      points: -22,
      reason: `Only ${daysLeft} days to deadline — below ${minDays}-day minimum`,
    };
  }
  if (daysLeft >= 45) return { points: 16, reason: `${daysLeft} days to deadline — ample runway` };
  if (daysLeft >= 21) return { points: 12, reason: `${daysLeft} days to deadline — good window` };
  if (daysLeft >= 14) return { points: 8, reason: `${daysLeft} days to deadline — moderate urgency` };
  return { points: 3, reason: `${daysLeft} days to deadline — tight timeline` };
}

function scoreContractValue(
  value: number | null,
  minValue: number | undefined,
): { points: number; reason: string } {
  if (value == null || minValue == null) {
    return { points: 0, reason: "Contract value not stated" };
  }
  if (value >= minValue * 3) {
    return {
      points: 14,
      reason: `Est. $${value.toLocaleString()} — strong value vs floor`,
    };
  }
  if (value >= minValue) {
    return {
      points: 8,
      reason: `Est. $${value.toLocaleString()} meets minimum threshold`,
    };
  }
  const ratio = value / minValue;
  return {
    points: Math.round(-18 * (1 - ratio)),
    reason: `Est. $${value.toLocaleString()} below $${minValue.toLocaleString()} floor`,
  };
}

function scoreNoticeType(opp: Opportunity): { points: number; reason: string } {
  switch (opp.notice_type) {
    case "solicitation":
      return { points: 10, reason: "Active solicitation" };
    case "sources_sought":
      return { points: 7, reason: "Sources sought / market research" };
    case "presolicitation":
      return { points: 5, reason: "Pre-solicitation — early capture" };
    case "special_notice":
      return { points: 2, reason: "Special notice — verify pursuable" };
    default:
      return { points: 0, reason: `Notice type: ${opp.notice_type}` };
  }
}

export function scoreOpportunity(opp: Opportunity, firm: FirmProfile): ScoreResult {
  const classification = classifyOpportunity(opp);
  const criteria = firm.goNoGo;
  const reasons: string[] = [];
  let score = 0;

  if (!classification.isPursuable) {
    const capped = classification.category === "industry_event" ? 18 : 12;
    return {
      fit_score: capped,
      go_no_go: "no_go",
      rationale: classification.reason,
      category: classification.category,
    };
  }

  const naics = scoreNaics(opp, firm);
  score += naics.points;
  reasons.push(naics.reason);

  const competency = scoreCompetencyRelevance(opp, firm);
  score += competency.points;
  reasons.push(competency.reason);

  if (firm.homeState && isInState(opp, firm.homeState)) {
    score += 14;
    reasons.push(`Home-state priority (${firm.homeState})`);
  } else {
    const target = firm.targetStates.find((s) => isInState(opp, s));
    if (target) {
      score += 6;
      reasons.push(`Target state (${target})`);
    }
  }

  if (opp.source === "grants_gov" || (opp.source === "sba" && opp.raw_data?.funding_type === "sba_grant_program")) {
    score += 8;
    reasons.push("Federal grant lane — verify eligibility for your organization type");
  }

  if (opp.raw_data?.funding_type === "sba_grant_program") {
    score += 6;
    reasons.push("SBA grant program reference");
  }

  if (matchesSetAside(opp.set_aside, criteria.preferredSetAsides)) {
    score += 14;
    reasons.push(`Set-aside "${opp.set_aside ?? "Unrestricted"}" fits preferences`);
  } else if (opp.set_aside) {
    score -= 6;
    reasons.push(`Set-aside "${opp.set_aside}" not in preferred list`);
  }

  const daysLeft = daysUntil(opp.response_deadline);
  const deadline = scoreDeadline(daysLeft, criteria.minDaysToDeadline);
  score += deadline.points;
  reasons.push(deadline.reason);

  const value = scoreContractValue(opp.estimated_value_usd, criteria.minContractValueUsd);
  score += value.points;
  reasons.push(value.reason);

  const notice = scoreNoticeType(opp);
  score += notice.points;
  reasons.push(notice.reason);

  if (criteria.excludedAgencies.length > 0 && opp.agency_name) {
    const agencyLower = opp.agency_name.toLowerCase();
    if (criteria.excludedAgencies.some((a) => agencyLower.includes(a.toLowerCase()))) {
      score -= 30;
      reasons.push("Excluded agency");
    }
  }

  if (
    opp.set_aside &&
    criteria.excludedSetAsides.some((x) => opp.set_aside!.toLowerCase().includes(x.toLowerCase()))
  ) {
    score -= 20;
    reasons.push(`Set-aside "${opp.set_aside}" excluded by firm rules`);
  }

  if (criteria.priorityAgencies.length > 0 && opp.agency_name) {
    const agencyLower = opp.agency_name.toLowerCase();
    if (criteria.priorityAgencies.some((a) => agencyLower.includes(a.toLowerCase()))) {
      score += 8;
      reasons.push("Priority agency match");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let go_no_go: ScoreResult["go_no_go"] = "review";
  if (score >= 72 && (daysLeft === null || daysLeft >= criteria.minDaysToDeadline)) {
    go_no_go = "go";
  } else if (
    score < 40 ||
    (daysLeft !== null && daysLeft < criteria.minDaysToDeadline) ||
    (naics.points === 0 && opp.source !== "grants_gov" && opp.source !== "sba")
  ) {
    go_no_go = "no_go";
  }

  return {
    fit_score: score,
    go_no_go,
    rationale: reasons.join("; "),
    category: classification.category,
  };
}

export function isHotScore(result: ScoreResult): boolean {
  return (
    result.category === "contract_opportunity" &&
    result.go_no_go !== "no_go" &&
    result.fit_score >= 55
  );
}
