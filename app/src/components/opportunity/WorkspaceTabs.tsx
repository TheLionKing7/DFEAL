"use client";

import { cn } from "@/shared/cn";

export type WorkspaceTab =
  | "overview"
  | "analyze"
  | "pursuit"
  | "documents"
  | "compliance";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analyze", label: "Analyze" },
  { id: "pursuit", label: "Pursuit" },
  { id: "documents", label: "Documents" },
  { id: "compliance", label: "Compliance" },
];

export function WorkspaceTabs({
  active,
  onChange,
}: {
  active: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-bg-surface p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-sidebar text-white shadow-sm"
              : "text-text-muted hover:bg-bg hover:text-text",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
