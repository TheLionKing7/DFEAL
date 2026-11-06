import { z } from "zod";
import { US_STATES } from "@/lib/firms/industries";
import { isValidNaics } from "@/lib/naics";
import { DOCUMENT_TYPES } from "@/shared/document-types";

const LANES = ["federal", "home", "state", "local", "education", "grants"] as const;
const NOTICE_TYPES = ["solicitation", "presolicitation", "sources_sought", "special_notice", "award", "other"] as const;
const DOC_IDS = DOCUMENT_TYPES.map((d) => d.id) as [string, ...string[]];

const list = (max = 30, itemMax = 120) => z.array(z.string().trim().min(1).max(itemMax)).max(max).default([]);

export const automationConfigSchema = z.object({
  trigger: z.enum(["new_opportunity", "deadline_approaching"]).default("new_opportunity"),
  schedule: z.enum(["hourly", "daily"]).default("daily"),
  filters: z
    .object({
      lanes: z.array(z.enum(LANES)).default(["federal"]),
      /** Empty → the workspace's state scope. */
      states: z.array(z.string().toUpperCase().refine((s) => (US_STATES as readonly string[]).includes(s))).default([]),
      /** Empty → any NAICS. */
      /** Full 6-digit codes or 2–5 digit prefixes (sector / subsector). */
      naics: z
        .array(z.string().trim().refine((c) => (c.length === 6 ? isValidNaics(c) : /^\d{2,5}$/.test(c)), "Invalid NAICS code or prefix"))
        .max(50)
        .default([]),
      keywords: list(),
      agencies: list(),
      setAsides: list(),
      noticeTypes: z.array(z.enum(NOTICE_TYPES)).default([]),
      minFitScore: z.number().min(0).max(100).default(60),
      goNoGo: z.array(z.enum(["go", "review", "no_go"])).default(["go", "review"]),
    })
    .default({}),
  deadlineDays: z.number().int().min(1).max(60).default(7),
  deadlineScope: z.enum(["pursuits", "track", "both"]).default("both"),
  actions: z
    .object({
      notifyMe: z.boolean().default(true),
      connectors: z.array(z.string().uuid()).max(10).default([]),
      calendarConnectors: z.array(z.string().uuid()).max(5).default([]),
      addToTrack: z.boolean().default(false),
      addToPursuits: z.boolean().default(false),
      draftDocument: z.enum(DOC_IDS).nullable().default(null),
      remember: z.boolean().default(true),
      mcp: z
        .object({
          connectorId: z.string().uuid(),
          tool: z.string().trim().min(1).max(120),
          /** JSON object; string values may use {{id}} {{title}} {{agency}} {{deadline}} {{fit}} {{url}} {{summary}} {{naics}}. */
          args: z.record(z.unknown()).default({}),
        })
        .nullable()
        .default(null),
    })
    .default({}),
  requireApproval: z.boolean().default(false),
  aiTriage: z.boolean().default(true),
  maxPerRun: z.number().int().min(1).max(25).default(10),
});

export type AutomationConfig = z.infer<typeof automationConfigSchema>;
export type AutomationConfigInput = z.input<typeof automationConfigSchema>;

export const automationInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  enabled: z.boolean().default(true),
  config: automationConfigSchema.default({}),
});

/** Older automations stored a loose config — normalise it, falling back to defaults. */
export function parseAutomationConfig(raw: unknown): AutomationConfig {
  const parsed = automationConfigSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return automationConfigSchema.parse({});
}
