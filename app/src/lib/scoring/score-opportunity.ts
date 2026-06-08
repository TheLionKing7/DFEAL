import {
  DFEAL_PROFILE,
  DFEAL_HOME_STATE,
  getDfealNaicsCodes,
  getDfealScoringCriteria,
} from "@/config/dfeal-profile";
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

function isIllinoisOpportunity(opp: Opportunity): boolean {
  if (opp.source === "bidbuy_il") return true;
  const state = opp.place_of_performance?.state?.toUpperCase();
  if (state === DFEAL_HOME_STATE) return true;
  const agency = (opp.agency_name ?? "").toLowerCase();
  return agency.includes("illinois") || /\bIL\b/.test(opp.title);
}

function scoreNaics(opp: Opportunity, dfealNaics: string[]): { points: number; reason: string } {
  const primary = DFEAL_PROFILE.primaryNaics;
  const secondary = new Set(DFEAL_PROFILE.secondaryNaics);

  if (!opp.naics) {
    if (opp.source === "bidbuy_il") {
      return { points: 6, reason: "Illinois bid — NAICS not listed on bulletin" };
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
  if (dfealNaics.some((n) => opp.naics!.slice(0, 2) === n.slice(0, 2))) {
    return { points: 6, reason: `NAICS ${opp.naics} weak sector overlap` };
  }
  return { points: 0, reason: `NAICS ${opp.naics} outside DFEAL profile` };
}

function scoreCompetencyRelevance(opp: Opportunity): { points: number; reason: string } {
  const text = `${opp.title} ${opp.description ?? ""}`.toLowerCase();
  const terms = [
    ...DFEAL_PROFILE.coreCompetencies,
    "healthcare",
    "clinical",
    "research",
    "procurement",
    "program management",
    "consulting",
    "medical",
    "it ",
    "information technology",
    "training",
    "compliance",
    "hipaa",
    "fda",
  ].map((t) => t.toLowerCase());

  let hits = 0;
  const matched: string[] = [];
  for (const term of terms) {
    if (text.includes(term) && matched.length < 4) {
      hits += 1;
      matched.push(term.slice(0, 30));
    }
  }

  const points = Math.min(22, hits * 5);
  if (points === 0) {
    return { points: 0, reason: "Low keyword alignment with DFEAL competencies" };
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

export function scoreOpportunity(opp: Opportunity): ScoreResult {
  const classification = classifyOpportunity(opp);
  const criteria = getDfealScoringCriteria();
  const dfealNaics = getDfealNaicsCodes();
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

  const naics = scoreNaics(opp, dfealNaics);
  score += naics.points;
  reasons.push(naics.reason);

  const competency = scoreCompetencyRelevance(opp);
  score += competency.points;
  reasons.push(competency.reason);

  if (isIllinoisOpportunity(opp)) {
    score += 14;
    reasons.push(`Illinois home-state priority (${DFEAL_HOME_STATE})`);
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
    naics.points === 0
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
