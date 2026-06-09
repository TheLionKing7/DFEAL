/** Format SAM expiration / registration dates for display. */
export function formatSamEntityDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not on file";
  return parsed.toLocaleDateString();
}

export function formatRegistrationLabel(
  status: string,
  source?: string,
): string {
  if (source === "profile_fallback") {
    return "Unverified — on-file profile only";
  }
  return status.replaceAll("_", " ");
}
