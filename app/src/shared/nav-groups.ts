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
      ...OPPORTUNITY_LANES.filter((l) => l.phase <= 3)
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
      { href: "/automations", label: "Automations" },
      { href: "/documents", label: "Document generator" },
      { href: "/entity", label: "SAM entity lookup" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    items: [
      { href: "/briefing", label: "Daily briefing" },
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
    title: "Assess my best-fit opportunities this week",
    prompt:
      "Review federal, Illinois, and SLED hot opportunities scored for DFEAL. List the top 5 with [[opp:id|title]] links, go/no-go rationale, and deadlines in the next 14 days.",
  },
  {
    title: "Find my next capture targets",
    prompt:
      "Generate a shortlist of the highest-value pursuits for DFEAL this month. Use [[opp:id|title]] for each recommendation and note set-aside, NAICS fit, and teaming needs.",
  },
  {
    title: "Pursuit pipeline review",
    prompt:
      "Review opportunities in my track list and pursuits. What should we advance, drop, or escalate this week?",
  },
  {
    title: "Proposal acceleration",
    prompt:
      "For my top hot opportunity, outline a proposal response plan with compliance checklist and document generation sequence.",
  },
];
