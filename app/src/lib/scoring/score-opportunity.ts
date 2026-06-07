import type { Opportunity } from "@/shared/types/opportunity";
import {
  getDfealNaicsCodes,
  getDfealScoringCriteria,
} from "@/config/dfeal-profile";

export interface ScoreResult {
  fit_score: number;
  go_no_go: "go" | "no_go" | "review";
  rationale: string;
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

export function scoreOpportunity(opp: Opportunity): ScoreResult {
  const criteria = getDfealScoringCriteria();
  const dfealNaics = new Set(getDfealNaicsCodes());
  const reasons: string[] = [];
  let score = 0;

  if (opp.naics && dfealNaics.has(opp.naics)) {
    score += 40;
    reasons.push(`NAICS ${opp.naics} matches DFEAL profile`);
  } else if (opp.naics) {
    score += 10;
    reasons.push(`NAICS ${opp.naics} is adjacent — verify fit`);
  } else {
    reasons.push("NAICS not listed on notice");
  }

  if (matchesSetAside(opp.set_aside, criteria.preferredSetAsides)) {
    score += 20;
    reasons.push(
      `Set-aside "${opp.set_aside ?? "Unrestricted"}" aligns with preferences`,
    );
  } else if (opp.set_aside) {
    reasons.push(`Set-aside "${opp.set_aside}" outside preferred list`);
  }

  const daysLeft = daysUntil(opp.response_deadline);
  if (daysLeft === null) {
    score += 5;
    reasons.push("No response deadline listed");
  } else if (daysLeft >= criteria.minDaysToDeadline) {
    score += 20;
    reasons.push(`${daysLeft} days until deadline (≥ ${criteria.minDaysToDeadline})`);
  } else {
    score -= 25;
    reasons.push(
      `Only ${daysLeft} days until deadline — below ${criteria.minDaysToDeadline}-day minimum`,
    );
  }

  if (opp.estimated_value_usd != null && criteria.minContractValueUsd != null) {
    if (opp.estimated_value_usd >= criteria.minContractValueUsd) {
      score += 20;
      reasons.push(
        `Est. value $${opp.estimated_value_usd.toLocaleString()} meets $${criteria.minContractValueUsd.toLocaleString()} floor`,
      );
    } else {
      score -= 15;
      reasons.push(
        `Est. value below $${criteria.minContractValueUsd.toLocaleString()} minimum`,
      );
    }
  } else {
    score += 5;
    reasons.push("Contract value not stated — confirm in solicitation");
  }

  score = Math.max(0, Math.min(100, score));

  let go_no_go: ScoreResult["go_no_go"] = "review";
  if (score >= 70 && (daysLeft === null || daysLeft >= criteria.minDaysToDeadline)) {
    go_no_go = "go";
  } else if (score < 45 || (daysLeft !== null && daysLeft < criteria.minDaysToDeadline)) {
    go_no_go = "no_go";
  }

  return {
    fit_score: score,
    go_no_go,
    rationale: reasons.join("; "),
  };
}

export function isHotScore(result: ScoreResult): boolean {
  return result.go_no_go !== "no_go" && result.fit_score >= 60;
}
