import { DEFAULT_GO_NO_GO, type FirmProfile } from "@/lib/firms/types";
import type { Opportunity } from "@/shared/types/opportunity";

export function makeFirm(overrides: Partial<FirmProfile> = {}): FirmProfile {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "acme",
    status: "active",
    legalName: "Acme Federal LLC",
    shortName: "Acme",
    uei: "ABCDEFGH1234",
    cage: "1A2B3",
    duns: null,
    samStatus: "active",
    samExpirationDate: null,
    industry: "it_services",
    primaryNaics: "541512",
    naicsCodes: ["541512", "541511", "541519"],
    pscCodes: [],
    keywords: ["cloud", "cybersecurity", "software"],
    setAsides: ["SDVOSB"],
    certifications: [],
    homeState: "VA",
    targetStates: ["MD"],
    capabilityStatement: "Acme builds secure cloud software.",
    coreCompetencies: ["Cloud migration"],
    differentiators: [],
    pastPerformance: [],
    goNoGo: { ...DEFAULT_GO_NO_GO, minDaysToDeadline: 5 },
    contactEmail: "bd@acme.test",
    phone: null,
    website: null,
    address: null,
    assistantName: "Acme's Assistant",
    allowedEmailDomains: ["acme.test"],
    digestRecipients: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    id: "sam-1",
    source: "sam",
    external_id: "1",
    notice_type: "solicitation",
    title: "Cloud migration and cybersecurity support services",
    description: "The agency requires software modernization and cloud hosting.",
    agency_id: null,
    agency_name: "Department of Veterans Affairs",
    naics: "541512",
    psc: null,
    set_aside: null,
    place_of_performance: { state: "VA" },
    estimated_value_usd: null,
    response_deadline: deadline,
    posted_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "active",
    archived_at: null,
    sam_url: null,
    source_url: null,
    raw_data: null,
    ...overrides,
  };
}
