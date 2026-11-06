/**
 * Firm form state <-> API payload. Plain module (no "use client") so server
 * components can call firmToForm() — calling a helper exported from a client
 * module on the server is what crashed the old settings page.
 */
import type { FirmProfile, PastPerformanceRecord, StateScope } from "@/lib/firms/types";

export interface FirmFormValues {
  legalName: string;
  shortName: string;
  dbaName: string;
  entityType: string;
  employeeRange: string;
  uei: string;
  cage: string;
  duns: string;
  industry: string;
  primaryNaics: string;
  naicsCodes: string[];
  keywords: string;
  setAsides: string[];
  certifications: string;
  homeState: string;
  targetStates: string[];
  capabilityStatement: string;
  coreCompetencies: string;
  differentiators: string;
  pastPerformance: PastPerformanceRecord[];
  minContractValueUsd: string;
  minDaysToDeadline: string;
  preferredSetAsides: string[];
  priorityAgencies: string;
  excludedAgencies: string;
  contactEmail: string;
  phone: string;
  website: string;
  address: string;
  assistantName: string;
  allowedEmailDomains: string;
  digestRecipients: string;
  ownerEmail: string;
  stateScope: StateScope;
  laneLocal: boolean;
  laneEducation: boolean;
  laneGrants: boolean;
  briefingEmail: boolean;
}

export function emptyFirmForm(): FirmFormValues {
  return {
    legalName: "",
    shortName: "",
    dbaName: "",
    entityType: "",
    employeeRange: "",
    uei: "",
    cage: "",
    duns: "",
    industry: "",
    primaryNaics: "",
    naicsCodes: [],
    keywords: "",
    setAsides: [],
    certifications: "",
    homeState: "",
    targetStates: [],
    capabilityStatement: "",
    coreCompetencies: "",
    differentiators: "",
    pastPerformance: [],
    minContractValueUsd: "",
    minDaysToDeadline: "5",
    preferredSetAsides: ["None", "Unrestricted"],
    priorityAgencies: "",
    excludedAgencies: "",
    contactEmail: "",
    phone: "",
    website: "",
    address: "",
    assistantName: "",
    allowedEmailDomains: "",
    digestRecipients: "",
    ownerEmail: "",
    stateScope: "selected",
    laneLocal: true,
    laneEducation: true,
    laneGrants: true,
    briefingEmail: true,
  };
}

export function firmToForm(f: FirmProfile): FirmFormValues {
  return {
    ...emptyFirmForm(),
    legalName: f.legalName,
    shortName: f.shortName,
    dbaName: f.dbaName ?? "",
    entityType: f.entityType ?? "",
    employeeRange: f.employeeRange ?? "",
    uei: f.uei ?? "",
    cage: f.cage ?? "",
    duns: f.duns ?? "",
    industry: f.industry,
    primaryNaics: f.primaryNaics,
    naicsCodes: f.naicsCodes,
    keywords: f.keywords.join(", "),
    setAsides: f.setAsides,
    certifications: f.certifications.join("\n"),
    homeState: f.homeState ?? "",
    targetStates: f.targetStates,
    capabilityStatement: f.capabilityStatement,
    coreCompetencies: f.coreCompetencies.join("\n"),
    differentiators: f.differentiators.join("\n"),
    pastPerformance: f.pastPerformance,
    minContractValueUsd: f.goNoGo.minContractValueUsd != null ? String(f.goNoGo.minContractValueUsd) : "",
    minDaysToDeadline: String(f.goNoGo.minDaysToDeadline),
    preferredSetAsides: f.goNoGo.preferredSetAsides,
    priorityAgencies: f.goNoGo.priorityAgencies.join("\n"),
    excludedAgencies: f.goNoGo.excludedAgencies.join("\n"),
    contactEmail: f.contactEmail ?? "",
    phone: f.phone ?? "",
    website: f.website ?? "",
    address: f.address ?? "",
    assistantName: f.assistantName,
    allowedEmailDomains: f.allowedEmailDomains.join(", "),
    digestRecipients: f.digestRecipients.join(", "),
    stateScope: f.workspace.stateScope,
    laneLocal: f.workspace.local,
    laneEducation: f.workspace.education,
    laneGrants: f.workspace.grants,
    briefingEmail: f.workspace.briefingEmail,
  };
}

const splitComma = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const splitLines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** Convert form state into the API payload validated by firmInputSchema. */
export function formToPayload(v: FirmFormValues) {
  return {
    legalName: v.legalName,
    shortName: v.shortName.trim() || undefined,
    uei: orNull(v.uei),
    cage: orNull(v.cage),
    duns: orNull(v.duns),
    industry: v.industry,
    primaryNaics: v.primaryNaics,
    naicsCodes: v.naicsCodes,
    keywords: splitComma(v.keywords),
    setAsides: v.setAsides,
    certifications: splitLines(v.certifications),
    homeState: orNull(v.homeState),
    targetStates: v.targetStates,
    capabilityStatement: v.capabilityStatement,
    coreCompetencies: splitLines(v.coreCompetencies),
    differentiators: splitLines(v.differentiators),
    pastPerformance: v.pastPerformance.filter((p) => p.contractName.trim() && p.agency.trim()),
    goNoGo: {
      minContractValueUsd: v.minContractValueUsd ? Number(v.minContractValueUsd) : undefined,
      minDaysToDeadline: Number(v.minDaysToDeadline || 5),
      preferredSetAsides: v.preferredSetAsides,
      priorityAgencies: splitLines(v.priorityAgencies),
      excludedAgencies: splitLines(v.excludedAgencies),
    },
    contactEmail: orNull(v.contactEmail),
    phone: orNull(v.phone),
    website: orNull(v.website),
    address: orNull(v.address),
    assistantName: orNull(v.assistantName),
    allowedEmailDomains: splitComma(v.allowedEmailDomains).map((d) => d.replace(/^@/, "").toLowerCase()),
    digestRecipients: splitComma(v.digestRecipients),
    ownerEmail: v.ownerEmail.trim() || undefined,
    dbaName: orNull(v.dbaName),
    entityType: orNull(v.entityType),
    employeeRange: orNull(v.employeeRange),
    workspace: {
      stateScope: v.stateScope,
      local: v.laneLocal,
      education: v.laneEducation,
      grants: v.laneGrants,
      briefingEmail: v.briefingEmail,
    },
  };
}

