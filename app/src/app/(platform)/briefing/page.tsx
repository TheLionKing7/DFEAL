"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { OpportunityHoverActions } from "@/components/opportunity/OpportunityHoverActions";
import { SMART_CAPTURE, TENANT } from "@/config/platform";
import type { BriefingEntry, DailyBriefingData } from "@/lib/briefing/build-briefing";
import { cn } from "@/shared/cn";

const CATEGORY_STYLE: Record<BriefingEntry["category"], string> = {
  market: "border-l-gold bg-gold/[0.04]",
  hot: "border-l-sidebar bg-sidebar/[0.03]",
  deadline: "border-l-error/60 bg-error/[0.03]",
  insight: "border-l-emerald-600/50 bg-emerald-50/30",
};

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/briefing");
        const data = (await res.json()) as { briefing?: DailyBriefingData; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load briefing");
        setBriefing(data.briefing ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load briefing");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const generated = briefing?.generated_at
    ? new Date(briefing.generated_at).toLocaleString()
    : null;

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        title="Daily Briefing"
        description={`Live capture journal for ${TENANT.legalName} — industry pulse, hot opportunities, and deadlines.`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-surface px-4 py-3 text-sm">
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
          LIVE
        </span>
        {generated && (
          <span className="text-text-muted">
            Last updated <time dateTime={briefing!.generated_at}>{generated}</time>
          </span>
        )}
        {briefing && (
          <>
            <span className="text-text-muted">·</span>
            <span>{briefing.hot_count} hot</span>
            <span className="text-text-muted">·</span>
            <span>{briefing.deadline_this_week} deadlines this week</span>
          </>
        )}
      </div>

      {loading && <p className="text-sm text-text-muted">Loading industry briefing…</p>}
      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {briefing && (
        <div className="space-y-4">
          <article className="rounded-2xl border border-gold/25 bg-gradient-to-br from-sidebar/5 to-gold/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              {SMART_CAPTURE.name} · Industry pulse
            </p>
            <p className="mt-3 text-base leading-relaxed text-text">{briefing.industry_pulse}</p>
          </article>

          <div className="relative space-y-4 border-l-2 border-border/60 pl-6">
            {briefing.entries.slice(1).map((entry) => (
              <article
                key={entry.id}
                className={cn(
                  "relative rounded-xl border border-border border-l-4 p-5 shadow-sm",
                  CATEGORY_STYLE[entry.category],
                )}
              >
                <span className="absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full border-2 border-bg bg-gold" />
                <time className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                  {new Date(entry.timestamp).toLocaleString()}
                </time>
                <h3 className="mt-1 text-base font-semibold text-text">{entry.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{entry.body}</p>

                {entry.opportunity_id && (
                  <div className="relative mt-3">
                    <OpportunityHoverActions
                      opportunityId={entry.opportunity_id}
                      title={entry.headline}
                    />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.actions.map((action) => (
                    <Link
                      key={action.href + action.label}
                      href={action.href}
                      className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text hover:border-gold/40 hover:text-gold"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
