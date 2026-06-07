'use client';

import { cn } from '../../shared/cn';

export type OpportunitySectionTab =
  | 'overview'
  | 'contacts'
  | 'similar'
  | 'files'
  | 'updates';

interface TabDef {
  id: OpportunitySectionTab;
  label: string;
  count?: number;
}

interface Props {
  active: OpportunitySectionTab;
  onChange: (tab: OpportunitySectionTab) => void;
  contactCount?: number;
  fileCount?: number;
  updateCount?: number;
  similarCount?: number;
}

/** GovTribe-style tab rail — ported from ProcureIQ OpportunitySectionTabs */
export function OpportunitySectionTabs({
  active,
  onChange,
  contactCount = 0,
  fileCount = 0,
  updateCount = 0,
  similarCount = 0,
}: Props) {
  const tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts', count: contactCount || undefined },
    { id: 'similar', label: 'Similar', count: similarCount || undefined },
    { id: 'files', label: 'Files', count: fileCount || undefined },
    { id: 'updates', label: 'Updates', count: updateCount || undefined },
  ];

  return (
    <div className="w-full max-w-full">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-bg-surface p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active === tab.id
                ? 'bg-sidebar text-white shadow-sm'
                : 'text-text-muted hover:bg-bg hover:text-text',
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  active === tab.id ? 'bg-white/20 text-white' : 'bg-gold/15 text-gold',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
