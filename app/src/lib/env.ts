import type { SamEntity } from "@/shared/types/entity";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function hasAnthropicApiKey(): boolean {
  return Boolean(optionalEnv("ANTHROPIC_API_KEY"));
}

export function hasGroqApiKey(): boolean {
  return Boolean(optionalEnv("GROQ_API_KEY"));
}

export function getSamApiKey(): string {
  return requireEnv("SAM_GOV_API_KEY");
}

export function getAnthropicApiKey(): string {
  return requireEnv("ANTHROPIC_API_KEY");
}

export function getGroqApiKey(): string {
  return requireEnv("GROQ_API_KEY");
}

export function getAnthropicModel(): string {
  return optionalEnv("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";
}

export function getGroqModel(): string {
  return optionalEnv("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
}

export function getSamOpportunitiesUrl(): string {
  return (
    process.env.SAM_GOV_OPPORTUNITIES_URL?.trim() ??
    "https://api.sam.gov/prod/opportunities/v2/search"
  );
}

export function getSamEntityUrl(): string {
  return (
    process.env.SAM_ENTITY_API_BASE?.trim() ??
    "https://api.sam.gov/entity-information/v3/entities"
  );
}

export type SamEntityRegistrationStatus = SamEntity["registration_status"];

export function mapSamRegistrationStatus(
  status: string | undefined,
): SamEntityRegistrationStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("active")) return "active";
  if (normalized.includes("expired")) return "expired";
  if (normalized.includes("inactive")) return "inactive";
  return "unknown";
}

/** MM/DD/YYYY — SAM opportunities API date format */
export function formatSamDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function samDateRange(daysBack = 30): { postedFrom: string; postedTo: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  return { postedFrom: formatSamDate(from), postedTo: formatSamDate(to) };
}
