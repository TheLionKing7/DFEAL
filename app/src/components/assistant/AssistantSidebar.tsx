"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAssistant } from "@/components/assistant/AssistantContext";
import { AssistantSettingsMenu } from "@/components/assistant/AssistantSettingsMenu";
import { TENANT } from "@/config/platform";
import { cn } from "@/shared/cn";

export function AssistantSidebarNav({
  onNewChat,
  onSearchFocus,
  sessions,
  sessionId,
  onSelectSession,
  search,
  onSearchChange,
  projectPanel,
  onProjectPanelChange,
  trackItems,
  favoriteItems,
}: {
  onNewChat: () => void;
  onSearchFocus?: () => void;
  sessions: { id: string; title: string | null; updated_at: string }[];
  sessionId: string | null;
  onSelectSession: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  projectPanel: "none" | "track" | "favorite";
  onProjectPanelChange: (v: "none" | "track" | "favorite") => void;
  trackItems: { opportunity_id: string; title?: string }[];
  favoriteItems: { opportunity_id: string; title?: string }[];
}) {
  const router = useRouter();
  const { closeAssistant } = useAssistant();

  function goToPage(path: string) {
    closeAssistant();
    router.push(path);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString();
  }

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-bg-surface md:flex md:w-56 lg:w-64">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-text">{TENANT.assistantName}</p>
      </div>

      <nav className="space-y-0.5 border-b border-border p-2">
        <SidebarNavButton icon="✎" label="New Chat" onClick={onNewChat} />
        <SidebarNavButton icon="⌕" label="Search" onClick={onSearchFocus} />
        <SidebarNavButton
          icon="◉"
          label="Daily Briefing"
          dot
          onClick={() => goToPage("/briefing")}
        />
        <SidebarNavButton
          icon="◷"
          label="Automations"
          badge="BETA"
          onClick={() => goToPage("/automations")}
        />
      </nav>

      <div className="border-b border-border p-2">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Projects
        </p>
        <SidebarNavButton icon="⊕" label="New Project" onClick={onNewChat} />
        <SidebarNavButton
          icon="◎"
          label="Track List"
          active={projectPanel === "track"}
          onClick={() => onProjectPanelChange(projectPanel === "track" ? "none" : "track")}
        />
        <SidebarNavButton
          icon="★"
          label="Favourite"
          active={projectPanel === "favorite"}
          onClick={() => onProjectPanelChange(projectPanel === "favorite" ? "none" : "favorite")}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {projectPanel !== "none" ? (
          <div className="flex-1 overflow-y-auto p-2">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {projectPanel === "track" ? "Tracked" : "Favourites"}
            </p>
            <ul className="mt-1 space-y-0.5">
              {(projectPanel === "track" ? trackItems : favoriteItems).length === 0 && (
                <li className="px-2 py-2 text-xs text-text-muted">No items yet</li>
              )}
              {(projectPanel === "track" ? trackItems : favoriteItems).map((item) => (
                <li key={item.opportunity_id}>
                  <Link
                    href={`/opportunities/${item.opportunity_id}`}
                    className="block rounded-md px-2 py-2 text-xs text-text-muted hover:bg-bg hover:text-text"
                  >
                    <span className="line-clamp-2">{item.title ?? item.opportunity_id}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search chats…"
              className="mb-2 w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs"
            />
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Chats
            </p>
            <ul className="mt-1 space-y-0.5">
              {sessions.length === 0 && (
                <li className="px-2 py-2 text-xs text-text-muted">No chats yet</li>
              )}
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(s.id)}
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-xs",
                      sessionId === s.id
                        ? "bg-gold/10 font-medium text-gold"
                        : "text-text-muted hover:bg-bg",
                    )}
                  >
                    <span className="line-clamp-2">{s.title ?? "New conversation"}</span>
                    <span className="mt-0.5 block text-[10px] opacity-70">{timeAgo(s.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AssistantSettingsMenu />
    </aside>
  );
}

function SidebarNavButton({
  icon,
  label,
  onClick,
  active,
  dot,
  badge,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  dot?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
        active ? "bg-gold/10 text-gold" : "text-text hover:bg-bg",
      )}
    >
      <span className="w-4 text-center text-text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {dot && <span className="h-2 w-2 rounded-full bg-gold" />}
      {badge && (
        <span className="rounded bg-sidebar px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
