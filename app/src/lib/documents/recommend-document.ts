import type { DocumentType } from "@/shared/document-types";
import { DOCUMENT_TYPES } from "@/shared/document-types";
import type { Opportunity } from "@/shared/types/opportunity";

export interface DocumentRecommendation {
  document_type: DocumentType;
  label: string;
  description: string;
  score: number;
  reason: string;
  recommended: boolean;
}

function haystack(opp: Opportunity): string {
  return [
    opp.title,
    opp.description ?? "",
    opp.notice_type,
    opp.agency_name ?? "",
    JSON.stringify(opp.raw_data ?? {}),
  ]
    .join(" ")
    .toLowerCase();
}

function scoreDocumentType(
  opp: Opportunity,
  doc: (typeof DOCUMENT_TYPES)[number],
): { score: number; reason: string } {
  const text = haystack(opp);
  let score = 0;
  const reasons: string[] = [];

  if (doc.noticeTypes.includes(opp.notice_type)) {
    score += 35;
    reasons.push(`Notice type is ${opp.notice_type.replace(/_/g, " ")}`);
  }

  for (const kw of doc.keywords) {
    if (text.includes(kw.toLowerCase())) {
      score += 25;
      reasons.push(`Mentions "${kw}"`);
      break;
    }
  }

  for (const kw of doc.keywords) {
    if (text.includes(kw.toLowerCase())) score += 8;
  }

  // Type-specific intelligence
  switch (doc.id) {
    case "rfi_response":
      if (/request for information|\brfi\b/.test(text)) {
        score += 40;
        reasons.push("RFI language detected");
      }
      break;
    case "sources_sought_response":
      if (opp.notice_type === "sources_sought") {
        score += 50;
        reasons.push("Sources sought notice");
      }
      break;
    case "capability_statement":
      if (/capabilit|qualification|vendor reg|company profile/.test(text)) {
        score += 35;
        reasons.push("Capability / qualifications language");
      }
      if (opp.notice_type === "special_notice" || opp.notice_type === "presolicitation") {
        score += 15;
      }
      break;
    case "cta_proposal":
      if (/teaming|subcontract|partner|cta|call to action/.test(text)) {
        score += 35;
        reasons.push("Teaming / CTA language");
      }
      break;
    case "contract_proposal":
      if (opp.notice_type === "solicitation") {
        score += 40;
        reasons.push("Formal solicitation");
      }
      if (/rfp|rfq|ifb|proposal|volume|section [lm]/.test(text)) {
        score += 25;
        reasons.push("RFP/RFQ proposal language");
      }
      break;
  }

  // Default fallbacks by notice type
  if (score < 20) {
    if (opp.notice_type === "solicitation" && doc.id === "contract_proposal") {
      score = 30;
      reasons.push("Default for active solicitation");
    }
    if (opp.notice_type === "sources_sought" && doc.id === "sources_sought_response") {
      score = 45;
      reasons.push("Default for sources sought");
    }
    if (
      (opp.notice_type === "presolicitation" || opp.notice_type === "special_notice") &&
      doc.id === "capability_statement"
    ) {
      score = 25;
      reasons.push("Default for pre-solicitation outreach");
    }
  }

  return {
    score: Math.min(100, score),
    reason: reasons.length ? reasons.slice(0, 2).join(" · ") : "Available if needed",
  };
}

export function recommendDocuments(opp: Opportunity): DocumentRecommendation[] {
  const ranked = DOCUMENT_TYPES.map((doc) => {
    const { score, reason } = scoreDocumentType(opp, doc);
    return {
      document_type: doc.id,
      label: doc.label,
      description: doc.description,
      score,
      reason,
      recommended: false,
    };
  }).sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score ?? 0;
  const threshold = Math.max(30, topScore - 15);

  return ranked.map((r, i) => ({
    ...r,
    recommended: r.score >= threshold && (i < 2 || r.score >= topScore - 5),
  }));
}

export function primaryDocumentRecommendation(
  opp: Opportunity,
): DocumentRecommendation {
  return recommendDocuments(opp)[0];
}
