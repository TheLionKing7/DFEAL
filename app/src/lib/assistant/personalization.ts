import { z } from "zod";

/** The user's "mental model": how they think about capture, used to tailor every answer. */
export const personalizationSchema = z.object({
  role: z.string().trim().max(120).default(""),
  decisionStyle: z.enum(["", "data_driven", "intuitive", "consensus"]).default(""),
  riskAppetite: z.enum(["", "conservative", "balanced", "aggressive"]).default(""),
  pursuitStrategy: z.enum(["", "prime", "sub", "both"]).default(""),
  dealSize: z.string().trim().max(120).default(""),
  priorities: z.string().trim().max(1500).default(""),
  mentalModels: z.string().trim().max(3000).default(""),
  communicationStyle: z.enum(["", "executive", "detailed", "bullets"]).default(""),
  avoid: z.string().trim().max(1000).default(""),
});

export type Personalization = z.infer<typeof personalizationSchema>;

export function parsePersonalization(raw: unknown): Personalization {
  const r = personalizationSchema.safeParse(raw ?? {});
  return r.success ? r.data : personalizationSchema.parse({});
}

const LABELS: Record<string, Record<string, string>> = {
  decisionStyle: { data_driven: "data-driven (show numbers and evidence)", intuitive: "intuitive (lead with the judgement call)", consensus: "consensus (frame options for the team)" },
  riskAppetite: { conservative: "conservative — only strong-fit bids", balanced: "balanced", aggressive: "aggressive — willing to stretch for growth" },
  pursuitStrategy: { prime: "prefers to prime", sub: "prefers to sub/team", both: "primes or subs depending on fit" },
  communicationStyle: { executive: "executive brief: answer first, 3 bullets max", detailed: "detailed analyst depth", bullets: "tight bullet points" },
};

export function formatPersonalization(p: Personalization): string {
  const lines = [
    p.role && `Role: ${p.role}`,
    p.decisionStyle && `Decision style: ${LABELS.decisionStyle[p.decisionStyle]}`,
    p.riskAppetite && `Risk appetite: ${LABELS.riskAppetite[p.riskAppetite]}`,
    p.pursuitStrategy && `Pursuit strategy: ${LABELS.pursuitStrategy[p.pursuitStrategy]}`,
    p.dealSize && `Target deal size: ${p.dealSize}`,
    p.priorities && `Current priorities:\n${p.priorities}`,
    p.mentalModels && `How they evaluate opportunities (their mental model):\n${p.mentalModels}`,
    p.communicationStyle && `Preferred style: ${LABELS.communicationStyle[p.communicationStyle]}`,
    p.avoid && `Avoid: ${p.avoid}`,
  ];
  return lines.filter(Boolean).join("\n");
}
