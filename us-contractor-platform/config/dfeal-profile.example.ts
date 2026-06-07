/**
 * DFEAL LLC company profile — template (sync with app/src/config/).
 * Populated instance lives in app/src/config/dfeal-profile.ts (gitignored).
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
  samStatus: 'active' | 'expired' | 'unknown';
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
}

export const DFEAL_PROFILE: DfealProfile = {
  legalName: 'DFEAL LLC',
  uei: 'G1XCPA2ANMC3',
  cage: '15RT3',
  samStatus: 'active',
  samExpirationDate: 'verify-via-sam-gov',
  primaryNaics: '541611',
  secondaryNaics: ['541618', '541714', '541512', '561320', '423450'],
  pscCodes: [],
  certifications: [
    'Small Business (SB)',
    'SAM.gov Registered & Active',
    'Government Purchase Card (GPC) Accepted',
    'Project Management Professional (PMP)',
    'Certified ScrumMaster (CSM)',
    'Lean Six Sigma',
    'Clinical Documentation Improvement Specialist (CDIS)',
    'Clinical Research Coordinator (CRC)',
    'Registered Nurse (RN)',
  ],
  capabilityStatement: 'See app/src/config/dfeal-profile.ts',
  coreCompetencies: [],
  differentiators: [],
  pastPerformance: [],
  goNoGo: {
    minContractValueUsd: 500_000,
    preferredSetAsides: ['8(a)', 'WOSB', 'None', 'Unrestricted'],
    excludedSetAsides: [],
    priorityAgencies: [],
    excludedAgencies: [],
    requiredCertifications: [],
    minDaysToDeadline: 5,
    geographicFocus: ['Federal', 'Illinois', 'Delaware', 'Ohio', 'Georgia'],
  },
  productName: 'DFEAL Capture',
  tagline: 'AI-Powered Government Contract Intelligence',
  teamContactEmail: 'bdev@dfeal.com',
};

export function buildDfealSystemPrompt(): string {
  const p = DFEAL_PROFILE;
  return [
    `You are an AI assistant working exclusively for ${p.legalName} (UEI: ${p.uei}, CAGE: ${p.cage}).`,
    `SAM status: ${p.samStatus}. Primary NAICS: ${p.primaryNaics}.`,
    `Certifications: ${p.certifications.join(', ') || 'none listed'}.`,
    `Core competencies: ${p.coreCompetencies.join('; ') || 'see capability statement'}.`,
    `Differentiators: ${p.differentiators.join('; ') || 'none listed'}.`,
    `Capability statement:\n${p.capabilityStatement}`,
    p.pastPerformance.length
      ? `Past performance:\n${p.pastPerformance.map((pp) => `- ${pp.contractName} (${pp.agency}): ${pp.scope}`).join('\n')}`
      : '',
    'Always recommend actions in DFEAL\'s best interest. Use DFEAL credentials in proposals — never generic placeholders.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function getDfealScoringCriteria(): GoNoGoRules {
  return DFEAL_PROFILE.goNoGo;
}

export function getDfealNaicsCodes(): string[] {
  return [DFEAL_PROFILE.primaryNaics, ...DFEAL_PROFILE.secondaryNaics].filter(Boolean);
}
