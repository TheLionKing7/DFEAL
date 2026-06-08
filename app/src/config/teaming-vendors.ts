/** Teaming vendor intelligence by jurisdiction — expand per tenant deployment */
export interface TeamingVendor {
  slug: string;
  name: string;
  jurisdiction: "federal" | "state_local" | "grants";
  specialty: string;
  naics?: string;
  location?: string;
}

export const TEAMING_VENDORS: TeamingVendor[] = [
  {
    slug: "phison-gate",
    name: "Phison Gate LLC",
    jurisdiction: "federal",
    specialty: "Program management & consulting",
    location: "Federal",
  },
  {
    slug: "stakk-a",
    name: "STAKK A LLC",
    jurisdiction: "federal",
    specialty: "Consulting & capture support",
    location: "Federal",
  },
  {
    slug: "midwest-moving",
    name: "Midwest Moving & Storage, Inc.",
    jurisdiction: "state_local",
    specialty: "Logistics & supply chain (IL state contracts)",
    location: "Illinois",
  },
  {
    slug: "bcg",
    name: "Boston Consulting Group",
    jurisdiction: "federal",
    specialty: "Procurement assistance & advisory",
    location: "Federal",
  },
  {
    slug: "regional-healthcare-it",
    name: "Regional Healthcare IT Partners",
    jurisdiction: "state_local",
    specialty: "Health IT & clinical systems (SLED)",
    location: "Illinois / Midwest",
  },
  {
    slug: "grantworks",
    name: "GrantWorks Advisory",
    jurisdiction: "grants",
    specialty: "Federal grant compliance & administration",
    location: "National",
  },
];

export function vendorsByJurisdiction(jurisdiction: TeamingVendor["jurisdiction"]) {
  return TEAMING_VENDORS.filter((v) => v.jurisdiction === jurisdiction);
}

export function getVendorBySlug(slug: string) {
  return TEAMING_VENDORS.find((v) => v.slug === slug) ?? null;
}
