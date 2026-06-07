import type { Opportunity, NoticeType, OpportunitySource } from '../../shared/types/opportunity';
import type { SamOpportunityRaw } from './client.stub';

function mapNoticeType(samType?: string): NoticeType {
  const t = (samType ?? '').toLowerCase();
  if (t.includes('presol')) return 'presolicitation';
  if (t.includes('award')) return 'award';
  if (t.includes('sources')) return 'sources_sought';
  if (t.includes('sol')) return 'solicitation';
  return 'other';
}

export function normalizeSamOpportunity(raw: SamOpportunityRaw, id?: string): Omit<Opportunity, 'updated_at'> & { updated_at?: string } {
  return {
    id: id ?? `sam-${raw.noticeId}`,
    source: 'sam' satisfies OpportunitySource,
    external_id: raw.noticeId,
    notice_type: mapNoticeType(raw.type),
    title: raw.title ?? 'Untitled notice',
    description: typeof raw.description === 'string' ? raw.description : null,
    agency_id: null,
    agency_name: raw.organizationName ?? null,
    naics: raw.naicsCode ?? null,
    psc: raw.classificationCode ?? null,
    set_aside: raw.typeOfSetAsideDescription ?? null,
    place_of_performance: raw.officeAddress
      ? {
          city: raw.officeAddress.city ?? null,
          state: raw.officeAddress.state ?? null,
          country: raw.officeAddress.countryCode ?? null,
        }
      : null,
    estimated_value_usd: null,
    response_deadline: raw.responseDeadLine ?? null,
    posted_date: raw.postedDate ?? null,
    status: 'active',
    sam_url: raw.uiLink ?? null,
    source_url: raw.uiLink ?? null,
    raw_data: raw as Record<string, unknown>,
  };
}
