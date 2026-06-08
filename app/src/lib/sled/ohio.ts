import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";

/**
 * OhioBuys public solicitations require browser + reCAPTCHA on Ivalua.
 * Automated ingest needs OhioBuys supplier credentials or a manual CSV import path.
 * @see https://ohiobuys.ohio.gov/page.aspx/en/rfp/request_browse_public
 */
export async function fetchOhioOpportunities(
  _options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const hasCredentials = Boolean(
    process.env.OHIOBUYS_USERNAME?.trim() && process.env.OHIOBUYS_PASSWORD?.trim(),
  );

  if (!hasCredentials) {
    return {
      source: "ohio",
      fetched: 0,
      opportunities: [],
      message:
        "OhioBuys requires authenticated access (reCAPTCHA on public browse). Set OHIOBUYS_USERNAME and OHIOBUYS_PASSWORD when available.",
    };
  }

  return {
    source: "ohio",
    fetched: 0,
    opportunities: [],
    message: "OhioBuys authenticated connector pending — credentials detected but ingest not yet implemented.",
  };
}

export const OHIO_CONNECTOR_META = {
  id: "ohio" as const,
  name: "OhioBuys",
  marketTier: "state" as const,
  phase: 3 as const,
  status: "credentials_required" as const,
  description: "Ohio state procurement — requires OhioBuys login (reCAPTCHA on public portal)",
};
