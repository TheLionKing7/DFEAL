"use client";

import Link from "next/link";
import { useState } from "react";
import { InlineAnalysisPanel } from "@/components/assistant/InlineAnalysisPanel";
import { useOpportunityLists } from "@/hooks/useOpportunityLists";
import { cn } from "@/shared/cn";

export function OpportunityHoverActions({
  opportunityId,
  title,
  className,
}: {
  opportunityId: string;
  title: string;
  className?: string;
}) {
  const { toggleList, createPursuit, isTracked, isFavorite } = useOpportunityLists();
  const [hover, setHover] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [busy, setBusy] = useState(false);

  async function act(action: "pursuit" | "track" | "favorite" | "analyze") {
    setBusy(true);
    try {
      if (action === "pursuit") await createPursuit(opportunityId);
      if (action === "track") await toggleList(opportunityId, "track");
      if (action === "favorite") await toggleList(opportunityId, "favorite");
      if (action === "analyze") setShowAnalysis(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {hover && (
        <div className="absolute right-0 top-0 z-10 flex flex-wrap gap-1 rounded-lg border border-border bg-bg-surface/95 p-1 shadow-md backdrop-blur">
          {(
            [
              ["pursuit", "Pursuit"],
              ["track", isTracked(opportunityId) ? "Untrack" : "Track"],
              ["favorite", isFavorite(opportunityId) ? "Unfav" : "Favourite"],
              ["analyze", "Analyze"],
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => void act(action)}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-text hover:bg-gold/10 hover:text-gold disabled:opacity-50"
            >
              {label}
            </button>
          ))}
          <Link
            href={`/opportunities/${opportunityId}`}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-gold hover:bg-gold/10"
          >
            Open
          </Link>
        </div>
      )}

      {showAnalysis && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2">
          <InlineAnalysisPanel
            opportunityId={opportunityId}
            title={title}
            onClose={() => setShowAnalysis(false)}
          />
        </div>
      )}
    </div>
  );
}
