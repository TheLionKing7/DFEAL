import { industryLabel } from "@/lib/firms/industries";
import type { FirmProfile } from "@/lib/firms/types";
import { naicsTitle } from "@/lib/naics";

/** System prompt describing the firm — prepended to every LLM call made on its behalf. */
export function buildFirmSystemPrompt(firm: FirmProfile): string {
  const naics = firm.naicsCodes
    .map((c) => `${c}${c === firm.primaryNaics ? " (primary)" : ""} ${naicsTitle(c) ?? ""}`.trim())
    .join("; ");
  const ids = [firm.uei && `UEI: ${firm.uei}`, firm.cage && `CAGE: ${firm.cage}`].filter(Boolean).join(", ");
  const g = firm.goNoGo;
  const geo = [firm.homeState && `home state ${firm.homeState}`, firm.targetStates.length && `target states ${firm.targetStates.join(", ")}`]
    .filter(Boolean)
    .join("; ");

  return [
    `You are an AI capture assistant working exclusively for ${firm.legalName}${ids ? ` (${ids})` : ""}.`,
    `Industry: ${industryLabel(firm.industry)}. SAM status: ${firm.samStatus}.`,
    `NAICS codes: ${naics}.`,
    firm.setAsides.length ? `Socioeconomic status / eligible set-asides: ${firm.setAsides.join(", ")}.` : "",
    firm.certifications.length ? `Certifications & designations: ${firm.certifications.join("; ")}.` : "",
    firm.coreCompetencies.length ? `Core competencies: ${firm.coreCompetencies.join("; ")}.` : "",
    firm.differentiators.length ? `Differentiators: ${firm.differentiators.join("; ")}.` : "",
    `Go/no-go rules: minimum contract value ${g.minContractValueUsd != null ? `$${g.minContractValueUsd.toLocaleString()}` : "n/a"}; preferred set-asides: ${g.preferredSetAsides.join(", ") || "any"}; require at least ${g.minDaysToDeadline} days until response deadline.`,
    geo ? `Geographic priority: ${geo}.` : "",
    firm.capabilityStatement ? `Capability statement:\n${firm.capabilityStatement}` : "",
    firm.pastPerformance.length
      ? `Past performance:\n${firm.pastPerformance.map((pp) => `- ${pp.contractName} — ${pp.agency}: ${pp.scope}`).join("\n")}`
      : "",
    `Always recommend actions in ${firm.shortName}'s best interest. Use ${firm.shortName}'s real credentials in proposals — never generic placeholders, and never invent past performance, certifications, or identifiers that are not listed above.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
