/**
 * Smart Capture document style system for professional document generation.
 * Shared across PDF and DOCX renderers for visual consistency.
 */

export const DOCUMENT_STYLES = {
  brand: {
    navy: "#0f2744",
    gold: "#c9a227",
    white: "#ffffff",
    darkGray: "#1e293b",
    mediumGray: "#334155",
    mutedGray: "#64748b",
    lightGray: "#e2e8f0",
    offWhite: "#f8fafc",
    accentGold: "#d4a843",
  },

  typography: {
    bodySize: 10.5,
    smallSize: 8,
    headingSizes: {
      h1: 18,
      h2: 14,
      h3: 12,
    },
    font: "Helvetica",
    fontBold: "Helvetica-Bold",
    fontOblique: "Helvetica-Oblique",
  },

  layout: {
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
    headerBandHeight: 110,
    footerY: 48,
    lineWidth: 540,
    gutter: 12,
  },

  coverPage: {
    bandHeight: 280,
    bottomBandHeight: 40,
  },
} as const;

export interface DocumentMeta {
  title: string;
  opportunityTitle?: string;
  agency?: string;
  documentType?: string;
  noticeId?: string;
  solicitationNumber?: string;
  responseDeadline?: string;
  setAside?: string;
  naics?: string;
}

/** Firm identity printed on the cover page and footer. */
export interface DocumentBranding {
  legalName: string;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
}

export function brandingContactLine(b: DocumentBranding): string {
  return [b.website, b.phone, b.address].filter(Boolean).join(" · ");
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100)
    .toLowerCase();
}
