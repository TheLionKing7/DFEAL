/** Smart Capture platform branding. Tenant (firm) branding comes from the firms table. */
export const SMART_CAPTURE = {
  name: "Smart Capture",
  tagline: "AI-Powered Contracting Intelligence",
  parentCompany: "Digital Fusion Labs",
  parentUrl: "https://www.digitafusion.com",
  copyright: `© ${new Date().getFullYear()} Digital Fusion Labs. All rights reserved.`,
} as const;

export function platformPageTitle(page?: string) {
  return page ? `${page} · ${SMART_CAPTURE.name}` : SMART_CAPTURE.name;
}
