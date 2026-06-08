"use client";

import { useRouter } from "next/navigation";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { cn } from "@/shared/cn";

export function Header({
  onMenuClick,
  alertCount = 0,
  assistantOpen = false,
}: {
  onMenuClick: () => void;
  alertCount?: number;
  assistantOpen?: boolean;
}) {
  const { openAssistant, closeAssistant, open: assistantPanelOpen } = useAssistant();
  const router = useRouter();

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const q = new FormData(form).get("q")?.toString().trim();
    if (q) router.push(`/opportunities?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg-surface/95 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-text-muted lg:hidden"
        aria-label="Menu"
      >
        ☰
      </button>
      <form onSubmit={handleSearch} className="hidden max-w-md flex-1 md:block">
        <input
          name="q"
          type="search"
          placeholder="Search opportunities…"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            assistantPanelOpen ? closeAssistant() : openAssistant({ newChat: true })
          }
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium",
            assistantOpen
              ? "bg-gold/15 text-gold ring-1 ring-gold/25"
              : "text-text-muted hover:text-gold",
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-gold">
            ✦
          </span>
          <span className="hidden md:inline">AI consultant</span>
        </button>
        <LinkSignOut />
        {alertCount > 0 && (
          <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">
            {alertCount}
          </span>
        )}
      </div>
    </header>
  );
}

function LinkSignOut() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-bg"
      >
        Sign out
      </button>
    </form>
  );
}
