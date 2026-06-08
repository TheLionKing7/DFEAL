/**
 * DFEAL LLC company profile — from public capability statements & NAICS codes.
 * Safe to commit (UEI/CAGE are on SAM.gov). API keys stay in env vars only.
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
  samExpirationDate: string;
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

/** DFEAL operates from Illinois — home state gets capture priority in scoring and ingest */
export const DFEAL_HOME_STATE = "IL";

export const DFEAL_PROFILE: DfealProfile = {
  legalName: "DFEAL LLC",
  uei: "G1XCPA2ANMC3",
  cage: "15RT3",
  duns: "11-926-8200",
  samStatus: "active",
  samExpirationDate: "verify-via-sam-gov",
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
  capabilityStatement: `Delivering Compliant, Agile Solutions for Mission-Critical Healthcare Programs.

DFEAL LLC is a healthcare and program management consulting firm providing specialized support to mission-critical organizations through healthcare program coordination, clinical and research administration, operational support services, and medical supply procurement.

We provide end-to-end program and project coordination, PMO support, clinical trial coordination, research operations, regulatory documentation management (FDA & IRB), and government medical supply procurement including PPE, hospital consumables, clinical/laboratory supplies, and durable medical equipment.

DFEAL also delivers R&D, Health IT (AI/ML-powered systems), scientific and technical consulting, project management aligned with PMI standards, and training & capacity building for healthcare, biotech, and government organizations. Solutions are architected with FAR, HIPAA, and NIST SP 800-171 compliance in mind.`,
  coreCompetencies: [
    "Healthcare Program Management & PMO Support",
    "Clinical & Research Support (IRB, SOP, trial coordination)",
    "Government Medical Supply Procurement",
    "Research & Development (biomedical, healthcare technologies)",
    "Health IT & Analytics (AI/ML-powered systems)",
    "Scientific & Technical Consulting",
    "Project Management (PMI standards)",
    "Training & Capacity Building",
  ],
  differentiators: [
    "Integrated service model — research, program management & procurement through one relationship",
    "Regulatory fluency — deep FDA & IRB compliance expertise",
    "Clinical credibility — leadership grounded in ICU, research ops & healthcare management",
    "Agile delivery — PMP-certified with Lean Six Sigma & Agile/Scrum execution",
    "AI & ML integration for healthcare and research analytics",
    "Federal compliance by design — FAR, HIPAA, NIST SP 800-171",
    "Medical supply — GSA Schedule 65 relationships, rapid emergency response, GPC accepted",
  ],
  pastPerformance: [
    {
      contractName: "Healthcare Program Coordination",
      agency: "Holy Cross Health",
      period: "Ongoing",
      scope:
        "Healthcare program coordination and clinical research administration.",
    },
    {
      contractName: "PMO & Grant Administration",
      agency: "Adventist HealthCare",
      period: "Ongoing",
      scope: "PMO operations and grant/contract administration.",
    },
    {
      contractName: "Clinical Trial & IRB Support",
      agency: "Johns Hopkins Medicine",
      period: "Ongoing",
      scope:
        "IRB coordination, regulatory documentation, and clinical trial support.",
    },
    {
      contractName: "Program Management",
      agency: "Encompass Health",
      period: "Ongoing",
      scope: "Operational support and program management.",
    },
    {
      contractName: "Consulting / Program Management",
      agency: "Phison Gate LLC",
      period: "Ongoing",
      scope: "Consulting and program management services.",
    },
    {
      contractName: "Consulting / Program Management",
      agency: "STAKK A LLC",
      period: "Ongoing",
      scope: "Consulting and program management services.",
    },
  ],
  goNoGo: {
    minContractValueUsd: 500_000,
    maxContractValueUsd: undefined,
    preferredSetAsides: ["8(a)", "WOSB", "None", "Unrestricted"],
    excludedSetAsides: [],
    priorityAgencies: [],
    excludedAgencies: [],
    requiredCertifications: [],
    minDaysToDeadline: 5,
    geographicFocus: [
      "Illinois",
      "Federal",
      "Delaware",
      "Ohio",
      "Georgia",
    ],
  },
  productName: "DFEAL Capture",
  tagline: "AI-Powered Government Contract Intelligence",
  teamContactEmail: "bdev@dfeal.com",
  website: "https://www.dfeal.com",
  phone: "+1 (844) 442-0529",
  address: "254 Chapman Rd, Ste 208, Newark, DE 19702",
};

export function buildDfealSystemPrompt(): string {
  const p = DFEAL_PROFILE;
  const allNaics = getDfealNaicsCodes().join(", ");
  return [
    `You are an AI assistant working exclusively for ${p.legalName} (UEI: ${p.uei}, CAGE: ${p.cage}).`,
    `SAM status: ${p.samStatus}. NAICS codes: ${allNaics}.`,
    `Certifications & designations: ${p.certifications.join("; ")}.`,
    `Core competencies: ${p.coreCompetencies.join("; ")}.`,
    `Differentiators: ${p.differentiators.join("; ")}.`,
    `Go/no-go rules: minimum contract value $${p.goNoGo.minContractValueUsd?.toLocaleString() ?? "n/a"}; preferred set-asides: ${p.goNoGo.preferredSetAsides.join(", ")}; require at least ${p.goNoGo.minDaysToDeadline} days until response deadline.`,
    `Geographic priority: ${p.goNoGo.geographicFocus.join(", ")} (Illinois is DFEAL home state — prioritize IL/BidBuy opportunities in capture recommendations).`,
    `Capability statement:\n${p.capabilityStatement}`,
    p.pastPerformance.length
      ? `Past performance:\n${p.pastPerformance.map((pp) => `- ${pp.agency} — ${pp.scope}`).join("\n")}`
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
