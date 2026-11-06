"use client";

import { useRouter } from "next/navigation";
import { useFirm } from "@/components/firm/FirmProvider";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const firm = useFirm();
  const router = useRouter();

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q")?.toString().trim();
    if (q) router.push(`/opportunities?lane=federal&q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg-surface/95 px-4 backdrop-blur lg:px-6">
      <button type="button" onClick={onMenuClick} className="rounded-lg p-2 text-text-muted lg:hidden" aria-label="Menu">
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
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-xs text-text-muted md:inline">{firm.legalName}</span>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-bg">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
