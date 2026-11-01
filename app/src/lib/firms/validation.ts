import { z } from "zod";
import { getIndustryPreset, US_STATES } from "@/lib/firms/industries";
import { isValidNaics } from "@/lib/naics";

const trimmedList = (max: number, itemMax = 200) =>
  z
    .array(z.string().trim().min(1).max(itemMax))
    .max(max)
    .transform((list) => [...new Set(list)]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const stateCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((s) => (US_STATES as readonly string[]).includes(s), "Invalid US state code");

const naicsCode = z
  .string()
  .trim()
  .refine(isValidNaics, (code) => ({ message: `${code} is not a valid 2022 NAICS code` }));

/** Public mailbox providers can never be auto-join domains (anyone could join the firm). */
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com",
  "zoho.com", "yandex.com", "chemist.com",
]);

const emailDomain = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid email domain")
  .refine((d) => !PUBLIC_EMAIL_DOMAINS.has(d), (d) => ({
    message: `${d} is a public email provider and cannot be an auto-join domain`,
  }));

export const pastPerformanceSchema = z.object({
  contractName: z.string().trim().min(1).max(200),
  agency: z.string().trim().min(1).max(200),
  period: z.string().trim().max(100).default(""),
  valueUsd: z.number().nonnegative().optional(),
  scope: z.string().trim().max(2000).default(""),
  naics: z.string().trim().optional(),
});

export const goNoGoSchema = z.object({
  minContractValueUsd: z.number().nonnegative().optional(),
  maxContractValueUsd: z.number().nonnegative().optional(),
  preferredSetAsides: trimmedList(20, 60).default(["None", "Unrestricted"]),
  excludedSetAsides: trimmedList(20, 60).default([]),
  priorityAgencies: trimmedList(50).default([]),
  excludedAgencies: trimmedList(50).default([]),
  minDaysToDeadline: z.number().int().min(0).max(120).default(5),
});

export const firmInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{1,48}$/, "Slug must be 2–49 chars: lowercase letters, numbers, dashes")
      .optional(),
    legalName: z.string().trim().min(2).max(200),
    shortName: z.string().trim().min(1).max(40).optional(),
    uei: optionalText(12).refine((v) => !v || /^[A-Z0-9]{12}$/i.test(v), "UEI must be 12 alphanumeric characters"),
    cage: optionalText(5).refine((v) => !v || /^[A-Z0-9]{5}$/i.test(v), "CAGE must be 5 alphanumeric characters"),
    duns: optionalText(20),
    industry: z.string().trim().refine((k) => Boolean(getIndustryPreset(k)), "Unknown industry"),
    primaryNaics: naicsCode,
    naicsCodes: z.array(naicsCode).max(50).default([]),
    pscCodes: trimmedList(50, 10).default([]),
    keywords: trimmedList(60, 60).default([]),
    setAsides: trimmedList(20, 60).default([]),
    certifications: trimmedList(40).default([]),
    homeState: stateCode.optional().nullable(),
    targetStates: z.array(stateCode).max(56).default([]),
    capabilityStatement: z.string().trim().max(8000).default(""),
    coreCompetencies: trimmedList(30).default([]),
    differentiators: trimmedList(30, 400).default([]),
    pastPerformance: z.array(pastPerformanceSchema).max(30).default([]),
    goNoGo: goNoGoSchema.default({}),
    contactEmail: optionalText(200).refine((v) => !v || z.string().email().safeParse(v).success, "Invalid contact email"),
    phone: optionalText(40),
    website: optionalText(300).refine((v) => !v || /^https?:\/\//i.test(v), "Website must start with http(s)://"),
    address: optionalText(300),
    assistantName: optionalText(60),
    allowedEmailDomains: z.array(emailDomain).max(10).default([]),
    digestRecipients: z.array(z.string().trim().toLowerCase().email()).max(25).default([]),
  })
  .transform((input) => {
    const naicsCodes = [...new Set([input.primaryNaics, ...input.naicsCodes])];
    const shortName = input.shortName || input.legalName.replace(/,?\s+(llc|inc\.?|corp\.?|co\.?|ltd\.?)$/i, "");
    return {
      ...input,
      naicsCodes,
      shortName,
      uei: input.uei?.toUpperCase() ?? null,
      cage: input.cage?.toUpperCase() ?? null,
      homeState: input.homeState ?? null,
      assistantName: input.assistantName ?? `${shortName}'s Assistant`,
    };
  });

export type FirmInput = z.input<typeof firmInputSchema>;
export type ValidFirmInput = z.output<typeof firmInputSchema>;

export const memberInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/,?\s+(llc|inc\.?|corp\.?|co\.?|ltd\.?)$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "firm"
  );
}

/** Flatten zod issues into `{ field: message }` for form display. */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
