import { OPPORTUNITY_LANES } from "@/shared/opportunity-lanes";

export interface NavItem {
  href: string;
  label: string;
  lane?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "opportunities",
    label: "Opportunities",
    items: [
      { href: "/explore", label: "Hot feed" },
      { href: "/opportunities", label: "All federal" },
      ...OPPORTUNITY_LANES.filter((l) => l.phase <= 3 && l.id !== "grants")
        .sort((a, b) => {
          if (a.id === "illinois") return -1;
          if (b.id === "illinois") return 1;
          if (a.id === "federal") return -1;
          if (b.id === "federal") return 1;
          return 0;
        })
        .map((l) => ({
        href: l.href,
        label: l.label,
        lane: l.id,
      })),
    ],
  },
  {
    id: "capture",
    label: "Capture workspace",
    items: [
      { href: "/watchlist", label: "Pursuits" },
      { href: "/documents", label: "Document generator" },
      { href: "/entity", label: "SAM entity lookup" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    items: [
      { href: "/reports/digest", label: "Daily digest" },
      { href: "/reports/pipeline", label: "Pipeline summary" },
      { href: "/reports/scoring", label: "Scoring analytics" },
    ],
  },
  {
    id: "participants",
    label: "Participants",
    items: [
      { href: "/agencies", label: "Federal agencies" },
      { href: "/entity", label: "SAM registration" },
      { href: "/participants/vendors", label: "Teaming vendors" },
    ],
  },
  {
    id: "files",
    label: "Files",
    items: [
      { href: "/documents", label: "Generated proposals" },
      { href: "/files/templates", label: "Proposal templates" },
    ],
  },
];

export const ASSISTANT_PROMPTS = [
  {
    title: "Strategic planning",
    prompt:
      "Review my current hot opportunities and design a capture execution strategy with go/no-go criteria, win themes, and a 2-week action plan for DFEAL.",
  },
  {
    title: "Opportunity discovery",
    prompt:
      "Find the next best Illinois, federal, and SLED opportunities aligned to DFEAL NAICS and certifications. Prioritize Illinois home-state bids first, then by fit score and deadline.",
  },
  {
    title: "Pursuit intelligence",
    prompt:
      "For opportunities in my pursuit pipeline, what teaming partners, compliance risks, and proposal gaps should we address first?",
  },
  {
    title: "Proposal acceleration",
    prompt:
      "Outline a proposal response strategy with section owners, compliance checklist, and document generation sequence for our top pursuit.",
  },
];
