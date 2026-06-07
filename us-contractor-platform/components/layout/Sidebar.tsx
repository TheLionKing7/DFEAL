'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { OPPORTUNITY_LANES } from '../../shared/opportunity-lanes';
import { useAssistant } from '../assistant/AssistantContext';
import { cn } from '../../shared/cn';

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lane = searchParams.get('lane') ?? '';
  const { closeAssistant } = useAssistant();

  const nav = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      onClick={() => {
        closeAssistant();
        onClose();
      }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
        active ? 'bg-gold/20 text-gold' : 'text-sidebar-muted hover:bg-white/10 hover:text-white',
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-surface bg-sidebar text-white lg:static',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/explore" onClick={onClose} className="text-xl font-bold">
            DFEAL Capture
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-sidebar-muted">
            AI-Powered Contract Intelligence
          </p>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          <div>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">Explore</p>
            {nav('/explore', '◎ Explore', pathname === '/explore')}
          </div>
          <div>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">
              Opportunities
            </p>
            {nav('/opportunities', 'All', pathname === '/opportunities' && !lane)}
            {OPPORTUNITY_LANES.map((l) =>
              nav(l.href, l.label, pathname === '/opportunities' && lane === l.id),
            )}
          </div>
          <div>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">Intel</p>
            {nav('/agencies', 'Agencies', pathname.startsWith('/agencies'))}
            {nav('/entity', 'SAM Entity', pathname === '/entity')}
            {nav('/watchlist', 'Watchlist', pathname === '/watchlist')}
            {nav('/awards', 'Awards', pathname === '/awards')}
            {nav('/settings', 'Settings', pathname === '/settings')}
          </div>
        </nav>
      </aside>
    </>
  );
}
