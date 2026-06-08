/** Teaming vendor intelligence by jurisdiction — expand per tenant deployment */
export interface TeamingVendor {
  name: string;
  jurisdiction: "federal" | "state_local" | "grants";
  specialty: string;
  naics?: string;
  location?: string;
}

export const TEAMING_VENDORS: TeamingVendor[] = [
  {
    name: "Phison Gate LLC",
    jurisdiction: "federal",
    specialty: "Program management & consulting",
    location: "Federal",
  },
  {
    name: "STAKK A LLC",
    jurisdiction: "federal",
    specialty: "Consulting & capture support",
    location: "Federal",
  },
  {
    name: "Midwest Moving & Storage, Inc.",
    jurisdiction: "state_local",
    specialty: "Logistics & supply chain (IL state contracts)",
    location: "Illinois",
  },
  {
    name: "Boston Consulting Group",
    jurisdiction: "federal",
    specialty: "Procurement assistance & advisory",
    location: "Federal",
  },
  {
    name: "Regional Healthcare IT Partners",
    jurisdiction: "state_local",
    specialty: "Health IT & clinical systems (SLED)",
    location: "Illinois / Midwest",
  },
  {
    name: "GrantWorks Advisory",
    jurisdiction: "grants",
    specialty: "Federal grant compliance & administration",
    location: "National",
  },
];

export function vendorsByJurisdiction(jurisdiction: TeamingVendor["jurisdiction"]) {
  return TEAMING_VENDORS.filter((v) => v.jurisdiction === jurisdiction);
}
