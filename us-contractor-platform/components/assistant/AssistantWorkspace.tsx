'use client';

/**
 * GovTribe-style AI workspace shell — implement chat API in new repo.
 * Full logic: ProcureIQ apps/web/components/assistant/ProcureIQAssistantPage.tsx
 */
import { useAssistant } from './AssistantContext';
import { usePageContext } from './PageContextProvider';

export function AssistantWorkspace({ embedded = false }: { embedded?: boolean }) {
  const { closeAssistant } = useAssistant();
  const { pageContext } = usePageContext();

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-bg">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-bg-surface md:flex">
        <div className="border-b border-border px-4 py-3 font-bold">AI Assistant</div>
        <nav className="space-y-1 p-2 text-sm text-text-muted">
          <button type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-bg">
            New Chat
          </button>
          <button type="button" className="block w-full rounded-lg px-3 py-2 text-left hover:bg-bg">
            Daily Briefing
          </button>
        </nav>
        <p className="mt-auto border-t border-border p-3 text-xs text-text-muted">
          Wire chat list + settings from ProcureIQ AssistantWorkspace
        </p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {embedded && pageContext.page !== 'unknown' && (
          <div className="border-b border-border bg-gold/[0.06] px-4 py-2 text-xs text-text-muted">
            <span className="font-semibold uppercase text-gold">Context</span>
            <span className="mx-2">·</span>
            {pageContext.summary ?? pageContext.label}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-text">Hi, how can I help today?</h2>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            Implement runAssistant(message, history, pageContext) against your API.
          </p>
        </div>
        <footer className="border-t border-border p-4">
          <input
            type="text"
            placeholder="Ask me anything…"
            className="w-full rounded-xl border border-border px-4 py-3 text-sm"
          />
        </footer>
        {embedded && (
          <button
            type="button"
            onClick={closeAssistant}
            className="absolute right-4 top-20 text-xs text-text-muted hover:text-gold md:hidden"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
