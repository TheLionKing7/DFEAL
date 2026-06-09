/**
 * DFEAL LLC company profile — template.
 *
 * Copy to dfeal-profile.ts and fill with real values.
 * Add dfeal-profile.ts to .gitignore — do not commit to git.
 *
 * Populated reference: see dfeal-profile.ts (gitignored) or DFEAL capability statements.
 */

export interface PastPerformanceRecord {
  contractName: string;
  agency: string;
  period: string;
  valueUsd?: number;
  scope: string;
  naics?: string;
}

export interface GoNoGoRules {
  minContractValueUsd?: number;
  maxContractValueUsd?: number;
  preferredSetAsides: string[];
  excludedSetAsides: string[];
  priorityAgencies: string[];
  excludedAgencies: string[];
  requiredCertifications: string[];
  minDaysToDeadline: number;
  geographicFocus: string[];
}

export interface DfealProfile {
  legalName: string;
  uei: string;
  cage: string;
  duns?: string;
  samStatus: "active" | "expired" | "unknown";
  samExpirationDate: string | null;
  primaryNaics: string;
  secondaryNaics: string[];
  pscCodes: string[];
  certifications: string[];
  capabilityStatement: string;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformance: PastPerformanceRecord[];
  goNoGo: GoNoGoRules;
  productName: string;
  tagline: string;
  teamContactEmail: string;
  website: string;
  phone: string;
  address: string;
}

/** Replace placeholders before use. */
export const DFEAL_HOME_STATE = "IL";

export const DFEAL_PROFILE: DfealProfile = {
  legalName: "DFEAL LLC",
  uei: "G1XCPA2ANMC3",
  cage: "15RT3",
  samStatus: "unknown",
  samExpirationDate: null,
  primaryNaics: "541611",
  secondaryNaics: ["541618", "541714", "541512", "561320", "423450"],
  pscCodes: [],
  certifications: [
    "Small Business (SB)",
    "SAM.gov Registered & Active",
    "Government Purchase Card (GPC) Accepted",
    "Project Management Professional (PMP)",
    "Certified ScrumMaster (CSM)",
    "Lean Six Sigma",
    "Clinical Documentation Improvement Specialist (CDIS)",
    "Clinical Research Coordinator (CRC)",
    "Registered Nurse (RN)",
  ],
  capabilityStatement: "Replace with DFEAL capability statement.",
  coreCompetencies: [],
  differentiators: [],
  pastPerformance: [],
  goNoGo: {
    minContractValueUsd: 500_000,
    maxContractValueUsd: undefined,
    preferredSetAsides: ["8(a)", "WOSB", "None", "Unrestricted"],
    excludedSetAsides: [],
    priorityAgencies: [],
    excludedAgencies: [],
    requiredCertifications: [],
    minDaysToDeadline: 5,
    geographicFocus: ["Illinois", "Federal", "Delaware", "Ohio", "Georgia"],
  },
  productName: "Smart Capture",
  tagline: "AI-Powered Contracting Intelligence",
  teamContactEmail: "bdev@dfeal.com",
  website: "https://www.dfeal.com",
  phone: "+1 (844) 442-0529",
  address: "254 Chapman Rd, Ste 208, Newark, DE 19702",
};

export function buildDfealSystemPrompt(): string {
  const p = DFEAL_PROFILE;
  return [
    `You are an AI assistant working exclusively for ${p.legalName} (UEI: ${p.uei}, CAGE: ${p.cage}).`,
    `SAM status: ${p.samStatus}. Primary NAICS: ${p.primaryNaics}.`,
    `Certifications & designations: ${p.certifications.join("; ") || "none listed"}.`,
    `Core competencies: ${p.coreCompetencies.join("; ") || "see capability statement"}.`,
    `Differentiators: ${p.differentiators.join("; ") || "none listed"}.`,
    `Capability statement:\n${p.capabilityStatement}`,
    p.pastPerformance.length
      ? `Past performance:\n${p.pastPerformance.map((pp) => `- ${pp.contractName} (${pp.agency}): ${pp.scope}`).join("\n")}`
      : "",
    "Always recommend actions in DFEAL's best interest. Use DFEAL credentials in proposals — never generic placeholders.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function getDfealScoringCriteria(): GoNoGoRules {
  return DFEAL_PROFILE.goNoGo;
}

export function getDfealNaicsCodes(): string[] {
  return [DFEAL_PROFILE.primaryNaics, ...DFEAL_PROFILE.secondaryNaics].filter(
    Boolean,
  );
}
