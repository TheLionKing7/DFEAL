'use client';

import Link from 'next/link';
import type { Opportunity } from '../../shared/types/opportunity';

function noticeTypeLabel(status: Opportunity['status'], noticeType: Opportunity['notice_type']) {
  if (status === 'awarded') return 'Award Notice';
  if (status === 'closed') return 'Closed';
  if (status === 'cancelled') return 'Cancelled';
  if (noticeType === 'presolicitation') return 'Pre-Solicitation';
  if (noticeType === 'sources_sought') return 'Sources Sought';
  return 'Active Solicitation';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  opportunity: Opportunity;
}

/** Contract strip under title — SAM notice #, type badge, timeline */
export function OpportunityContractHeader({ opportunity }: Props) {
  const typeLabel = noticeTypeLabel(opportunity.status, opportunity.notice_type);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Notice #</p>
          <p className="font-mono text-sm font-semibold text-text">{opportunity.external_id}</p>
        </div>
        <span className="rounded-full bg-sidebar/10 px-2.5 py-0.5 text-xs font-medium text-sidebar">
          {typeLabel}
        </span>
        {opportunity.set_aside && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
            {opportunity.set_aside}
          </span>
        )}
        {opportunity.source !== 'sam' && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs uppercase text-text-muted">
            {opportunity.source}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span>Posted {formatDate(opportunity.posted_date)}</span>
        <span>Response due {formatDate(opportunity.response_deadline)}</span>
        {opportunity.sam_url && (
          <a href={opportunity.sam_url} target="_blank" rel="noreferrer" className="text-gold hover:underline">
            Open on SAM.gov ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function OpportunityTitleBlock({
  opportunity,
  agencyName,
  agencyId,
  actions,
}: {
  opportunity: Opportunity;
  agencyName?: string | null;
  agencyId?: string | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Link href="/explore" className="text-sm text-text-muted hover:text-gold">
          ← Explore
        </Link>
        <h1 className="mt-2 line-clamp-3 text-lg font-bold leading-snug text-text lg:text-xl">
          {opportunity.title}
        </h1>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-text-muted">
          {agencyId ? (
            <Link href={`/agencies/${agencyId}`} className="hover:text-gold">
              {agencyName ?? opportunity.agency_name}
            </Link>
          ) : (
            opportunity.agency_name
          )}
          {opportunity.naics && <span>· NAICS {opportunity.naics}</span>}
          {opportunity.psc && <span>· PSC {opportunity.psc}</span>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
