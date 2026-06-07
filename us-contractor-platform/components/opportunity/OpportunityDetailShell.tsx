'use client';

import { useState } from 'react';
import type { Opportunity } from '../../shared/types/opportunity';
import {
  OpportunityContractHeader,
  OpportunityTitleBlock,
} from './OpportunityContractHeader';
import { OpportunitySectionTabs, type OpportunitySectionTab } from './OpportunitySectionTabs';

/**
 * Wireframe shell for opportunity detail — fill panels with API data in new repo.
 * Structure ported from ProcureIQ OpportunityDetailClient.
 */
export function OpportunityDetailShell({
  opportunity,
  agencyName,
  agencyId,
}: {
  opportunity: Opportunity;
  agencyName?: string | null;
  agencyId?: string | null;
}) {
  const [tab, setTab] = useState<OpportunitySectionTab>('overview');

  return (
    <div className="space-y-5 overflow-x-hidden">
      <OpportunityTitleBlock
        opportunity={opportunity}
        agencyName={agencyName}
        agencyId={agencyId}
        actions={
          <button
            type="button"
            className="rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium hover:border-gold/40"
          >
            Add to watchlist
          </button>
        }
      />
      <OpportunityContractHeader opportunity={opportunity} />
      <OpportunitySectionTabs active={tab} onChange={setTab} />
      <div className="rounded-xl border border-border bg-bg-surface p-6 text-sm text-text-muted">
        Panel: <strong className="text-text">{tab}</strong> — implement in new repo (
        <code>components/opportunity/panels/{tab}Panel.tsx</code>)
      </div>
    </div>
  );
}
