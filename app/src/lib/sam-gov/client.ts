import { getSamApiKey, getSamOpportunitiesUrl, samDateRange } from "@/lib/env";

export interface SamSearchParams {
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
  ncode?: string;
  typeOfSetAside?: string;
  title?: string;
}

export interface SamOpportunityRaw {
  noticeId: string;
  title?: string;
  description?: string;
  type?: string;
  naicsCode?: string;
  classificationCode?: string;
  typeOfSetAsideDescription?: string;
  responseDeadLine?: string;
  postedDate?: string;
  uiLink?: string;
  officeAddress?: { city?: string; state?: string; countryCode?: string };
  organizationName?: string;
  [key: string]: unknown;
}

interface SamSearchResponse {
  opportunitiesData?: SamOpportunityRaw[];
  totalRecords?: number;
}

export class SamGovClient {
  constructor(
    private readonly apiKey = getSamApiKey(),
    private readonly baseUrl = getSamOpportunitiesUrl(),
  ) {}

  async searchOpportunities(
    params: SamSearchParams = {},
  ): Promise<{ rows: SamOpportunityRaw[]; totalRecords: number }> {
    const range = samDateRange(30);
    const url = new URL(this.baseUrl);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("postedFrom", params.postedFrom ?? range.postedFrom);
    url.searchParams.set("postedTo", params.postedTo ?? range.postedTo);
    url.searchParams.set("limit", String(params.limit ?? 25));
    url.searchParams.set("offset", String(params.offset ?? 0));
    if (params.ncode) url.searchParams.set("ncode", params.ncode);
    if (params.typeOfSetAside) {
      url.searchParams.set("typeOfSetAside", params.typeOfSetAside);
    }
    if (params.title) url.searchParams.set("title", params.title);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SAM.gov search failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as SamSearchResponse;
    return {
      rows: data.opportunitiesData ?? [],
      totalRecords: data.totalRecords ?? data.opportunitiesData?.length ?? 0,
    };
  }
}

export function createSamGovClient(): SamGovClient {
  return new SamGovClient();
}
