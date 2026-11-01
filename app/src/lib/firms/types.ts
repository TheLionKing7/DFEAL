/**
 * Firm (tenant) profile — the single source of truth for who the platform is
 * working for on a given request. Replaces the old hardcoded DFEAL_PROFILE.
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
  minDaysToDeadline: number;
}

export type FirmRole = "owner" | "admin" | "member";
export type SamStatus = "active" | "expired" | "inactive" | "unknown";

export interface FirmProfile {
  id: string;
  slug: string;
  status: "active" | "suspended";

  legalName: string;
  shortName: string;
  uei: string | null;
  cage: string | null;
  duns: string | null;
  samStatus: SamStatus;
  samExpirationDate: string | null;

  /** Industry preset key (see lib/firms/industries.ts) */
  industry: string;
  primaryNaics: string;
  /** All NAICS codes pursued, including primaryNaics */
  naicsCodes: string[];
  pscCodes: string[];
  /** Capability keywords for SLED/grant filtering and scoring */
  keywords: string[];
  setAsides: string[];
  certifications: string[];
  /** Two-letter state code; gets home-state priority in scoring */
  homeState: string | null;
  targetStates: string[];

  capabilityStatement: string;
  coreCompetencies: string[];
  differentiators: string[];
  pastPerformance: PastPerformanceRecord[];
  goNoGo: GoNoGoRules;

  contactEmail: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  assistantName: string;

  allowedEmailDomains: string[];
  digestRecipients: string[];

  createdAt: string;
  updatedAt: string;
}

/** Safe subset passed to client components. */
export interface FirmClientInfo {
  id: string;
  slug: string;
  legalName: string;
  shortName: string;
  assistantName: string;
  website: string | null;
  uei: string | null;
  cage: string | null;
  industry: string;
  primaryNaics: string;
  role: FirmRole;
  isPlatformAdmin: boolean;
}

export const DEFAULT_GO_NO_GO: GoNoGoRules = {
  minContractValueUsd: undefined,
  maxContractValueUsd: undefined,
  preferredSetAsides: ["None", "Unrestricted"],
  excludedSetAsides: [],
  priorityAgencies: [],
  excludedAgencies: [],
  minDaysToDeadline: 5,
};

export function secondaryNaics(firm: Pick<FirmProfile, "primaryNaics" | "naicsCodes">): string[] {
  return firm.naicsCodes.filter((c) => c !== firm.primaryNaics);
}

export function toFirmClientInfo(
  firm: FirmProfile,
  role: FirmRole,
  isPlatformAdmin = false,
): FirmClientInfo {
  return {
    id: firm.id,
    slug: firm.slug,
    legalName: firm.legalName,
    shortName: firm.shortName,
    assistantName: firm.assistantName,
    website: firm.website,
    uei: firm.uei,
    cage: firm.cage,
    industry: firm.industry,
    primaryNaics: firm.primaryNaics,
    role,
    isPlatformAdmin,
  };
}
