'use client';

import { useAssistant } from '../assistant/AssistantContext';
import { cn } from '../../shared/cn';

export function Header({
  onMenuClick,
  alertCount = 0,
  assistantOpen = false,
}: {
  onMenuClick: () => void;
  alertCount?: number;
  assistantOpen?: boolean;
}) {
  const { openAssistant } = useAssistant();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg-surface/95 px-4 backdrop-blur lg:px-6">
      <button type="button" onClick={onMenuClick} className="rounded-lg p-2 text-text-muted lg:hidden" aria-label="Menu">
        ☰
      </button>
      <input
        type="search"
        placeholder="Search everywhere…"
        className="hidden max-w-md flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm md:block"
      />
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => openAssistant({ newChat: true })}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium',
            assistantOpen ? 'bg-gold/15 text-gold ring-1 ring-gold/25' : 'text-text-muted hover:text-gold',
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-gold">✦</span>
          <span className="hidden md:inline">AI</span>
        </button>
        <button type="button" className="relative rounded-lg p-2 text-text-muted" aria-label="Alerts">
          🔔
          {alertCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
