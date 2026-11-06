"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OpportunityHoverActions } from "@/components/opportunity/OpportunityHoverActions";
import type { BriefingEntry, DailyBriefingData } from "@/lib/briefing/build-briefing";
import { cn } from "@/shared/cn";

const CATEGORY_STYLE: Record<BriefingEntry["category"], string> = {
  market: "border-l-gold bg-gold/[0.04]",
  hot: "border-l-sidebar bg-sidebar/[0.03]",
  deadline: "border-l-error/60 bg-error/[0.03]",
  insight: "border-l-emerald-600/50 bg-emerald-50/30",
  pursuit: "border-l-sky-600/50 bg-sky-50/30",
  automation: "border-l-violet-600/50 bg-violet-50/30",
};

export function briefingSeenKey(firmId: string) {
  return `sc:briefing-seen:${firmId}`;
}

/** Shared daily-briefing view (full page and inside the assistant). */
export function BriefingContent({
  firmId,
  compact = false,
  onAsk,
  onNavigate,
}: {
  firmId: string;
  compact?: boolean;
  /** Called for "Analyze in chat" actions instead of navigating. */
  onAsk?: (query: string) => void;
  onNavigate?: () => void;
}) {
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (method: "GET" | "POST" = "GET") => {
    if (method === "POST") setRegenerating(true);
    try {
      const res = await fetch("/api/briefing", { method });
      const data = (await res.json()) as { briefing?: DailyBriefingData; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load briefing");
      setBriefing(data.briefing ?? null);
      setError(null);
      try {
        if (data.briefing) localStorage.setItem(briefingSeenKey(firmId), data.briefing.briefing_date);
      } catch {
        /* storage unavailable */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load briefing");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [firmId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-text-muted">Preparing today&apos;s briefing…</p>;
  if (error) return <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>;
  if (!briefing) return null;

  const pulse = briefing.entries.find((e) => e.id === "pulse-today");
  const rest = briefing.entries.filter((e) => e.id !== "pulse-today");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-surface px-4 py-3 text-sm">
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
          {new Date(`${briefing.briefing_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span>{briefing.hot_count} hot</span>
        <span className="text-text-muted">·</span>
        <span>{briefing.deadline_this_week} deadlines this week</span>
        {briefing.pending_approvals > 0 && (
          <>
            <span className="text-text-muted">·</span>
            <span className="text-gold">{briefing.pending_approvals} approvals waiting</span>
          </>
        )}
        <button
          type="button"
          disabled={regenerating}
          onClick={() => void load("POST")}
          className="ml-auto text-xs text-gold hover:underline disabled:opacity-50"
        >
          {regenerating ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {pulse && (
        <article className="rounded-2xl border border-gold/25 bg-gradient-to-br from-sidebar/5 to-gold/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">
            Industry pulse{briefing.ai_generated ? " · AI analyst" : ""}
          </p>
          <p className={cn("mt-2 leading-relaxed text-text", compact ? "text-sm" : "text-base")}>{pulse.body}</p>
          {onAsk && (
            <button
              type="button"
              onClick={() => onAsk("Walk me through today's briefing and tell me what to do first.")}
              className="mt-3 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium hover:border-gold/40 hover:text-gold"
            >
              Discuss with the assistant
            </button>
          )}
        </article>
      )}

      <div className="relative space-y-3 border-l-2 border-border/60 pl-5">
        {rest.map((entry) => (
          <article
            key={entry.id}
            className={cn("relative rounded-xl border border-border border-l-4 shadow-sm", compact ? "p-4" : "p-5", CATEGORY_STYLE[entry.category])}
          >
            <span className="absolute -left-[1.45rem] top-5 h-3 w-3 rounded-full border-2 border-bg bg-gold" />
            <h3 className={cn("font-semibold text-text", compact ? "text-sm" : "text-base")}>{entry.headline}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{entry.body}</p>
            {entry.opportunity_id && !compact && (
              <div className="relative mt-3">
                <OpportunityHoverActions opportunityId={entry.opportunity_id} title={entry.headline} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.actions.map((action) => {
                const ask = action.href.startsWith("/explore?ask=")
                  ? decodeURIComponent(action.href.slice("/explore?ask=".length))
                  : null;
                const cls =
                  "rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text hover:border-gold/40 hover:text-gold";
                return ask && onAsk ? (
                  <button key={action.href + action.label} type="button" onClick={() => onAsk(ask)} className={cls}>
                    {action.label}
                  </button>
                ) : (
                  <Link key={action.href + action.label} href={action.href} onClick={onNavigate} className={cls}>
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
