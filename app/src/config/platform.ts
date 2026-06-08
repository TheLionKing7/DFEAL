import { DFEAL_PROFILE } from "@/config/dfeal-profile";

/** Smart Capture platform branding — reusable across tenant deployments */
export const SMART_CAPTURE = {
  name: "Smart Capture",
  tagline: "AI-Powered Contracting Intelligence",
  parentCompany: "Digital Fusion Labs",
  parentUrl: "https://www.digitafusion.com",
  copyright: `© ${new Date().getFullYear()} Digital Fusion Labs. All rights reserved.`,
} as const;

/** Active tenant running on this Smart Capture instance */
export const TENANT = {
  legalName: DFEAL_PROFILE.legalName,
  shortName: "DFEAL",
  assistantName: "DFEAL's Assistant",
  website: DFEAL_PROFILE.website,
} as const;

export function platformPageTitle(page?: string) {
  return page ? `${page} · ${SMART_CAPTURE.name}` : SMART_CAPTURE.name;
}
