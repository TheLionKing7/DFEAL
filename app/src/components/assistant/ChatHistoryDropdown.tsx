"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/cn";

export interface ChatSessionItem {
  id: string;
  title: string | null;
  updated_at: string;
}

function nowMs() {
  return Date.now();
}

function timeAgo(iso: string) {
  const mins = Math.floor((nowMs() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

/** Chat history as a searchable dropdown in the assistant header. */
export function ChatHistoryDropdown({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onOpen,
}: {
  sessions: ChatSessionItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = sessions.find((s) => s.id === activeId);
  const term = q.trim().toLowerCase();
  const filtered = sessions.filter((s) => !term || (s.title ?? "").toLowerCase().includes(term));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          onOpen?.();
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex max-w-[16rem] items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs hover:border-gold/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-text-muted">Chats</span>
        <span className="truncate font-medium text-text">{active?.title ?? "New conversation"}</span>
        <span className="text-[10px] text-text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs outline-none focus:border-gold"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
            {filtered.map((s) => (
              <li key={s.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "min-w-0 flex-1 px-3 py-2 text-left text-xs",
                    s.id === activeId ? "bg-gold/10 font-medium text-gold" : "hover:bg-bg",
                  )}
                >
                  <span className="line-clamp-1">{s.title ?? "New conversation"}</span>
                  <span className="text-[10px] text-text-muted">{timeAgo(s.updated_at)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="px-2 text-[11px] text-text-muted opacity-0 hover:text-error group-hover:opacity-100"
                  aria-label="Delete chat"
                  title="Delete chat"
                >
                  ✕
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-3 text-xs text-text-muted">{term ? "No matching chats" : "No chats yet"}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
