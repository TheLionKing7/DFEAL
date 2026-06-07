/**
 * SAM.gov API client — IMPLEMENT in new repo with real API key.
 * @see docs/SAM-GOV-INGEST.md
 */

export interface SamSearchParams {
  postedFrom?: string;
  postedTo?: string;
  limit?: number;
  offset?: number;
  ncode?: string;
  typeOfSetAside?: string;
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

export class SamGovClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = process.env.SAM_GOV_OPPORTUNITIES_URL ??
      'https://api.sam.gov/prod/opportunities/v2/search',
  ) {}

  async searchOpportunities(params: SamSearchParams): Promise<SamOpportunityRaw[]> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('api_key', this.apiKey);
    if (params.postedFrom) url.searchParams.set('postedFrom', params.postedFrom);
    if (params.postedTo) url.searchParams.set('postedTo', params.postedTo);
    if (params.limit) url.searchParams.set('limit', String(params.limit));
    if (params.offset) url.searchParams.set('offset', String(params.offset));

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`SAM.gov search failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { opportunitiesData?: SamOpportunityRaw[] };
    return data.opportunitiesData ?? [];
  }

  async getOpportunity(noticeId: string): Promise<SamOpportunityRaw | null> {
    const rows = await this.searchOpportunities({ limit: 1 });
    void noticeId;
    void rows;
    throw new Error('Implement getOpportunity with SAM detail endpoint for noticeId');
  }
}
