"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";
import { SMART_CAPTURE } from "@/config/platform";
import { cn } from "@/shared/cn";

export function ExploreHero({ items }: { items: OpportunityCardData[] }) {
  const [index, setIndex] = useState(0);
  const featured = items.slice(0, 5);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % featured.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (featured.length === 0) {
    return (
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-sidebar via-sidebar-surface to-sidebar px-8 py-16 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">
          {SMART_CAPTURE.name}
        </p>
        <h2 className="mt-2 text-2xl font-bold">Welcome to {SMART_CAPTURE.name}</h2>
        <p className="mt-2 max-w-lg text-sidebar-muted">
          Run daily ingest to populate scored contract opportunities for your team.
        </p>
      </div>
    );
  }

  const current = featured[index];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-br from-sidebar via-[#152d4a] to-sidebar-surface text-white shadow-lg">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,168,76,0.12),_transparent_55%)]" />
      <div className="relative px-6 py-8 md:px-10 md:py-10">
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sidebar-muted">
          {current.response_deadline && (
            <span>Due {new Date(current.response_deadline).toLocaleString()}</span>
          )}
          {current.fit_score != null && <span>Fit score {current.fit_score}%</span>}
          {current.notice_type && (
            <span className="capitalize">{current.notice_type.replace(/_/g, " ")}</span>
          )}
        </div>

        <h2 className="max-w-3xl text-2xl font-bold leading-tight md:text-3xl">
          <Link href={`/opportunities/${current.id}`} className="hover:text-gold">
            {current.title}
          </Link>
        </h2>

        <p className="mt-2 text-sm text-white/85">
          {current.agency_name ?? "Agency TBD"}
          {current.naics ? ` · NAICS ${current.naics}` : ""}
        </p>

        {current.score_rationale && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sidebar-muted line-clamp-3">
            {current.score_rationale}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/opportunities/${current.id}`}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-sidebar hover:bg-gold/90"
          >
            Open workspace
          </Link>
          <Link
            href="/opportunities"
            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Browse all
          </Link>
        </div>
      </div>

      {featured.length > 1 && (
        <div className="relative flex justify-center gap-2 pb-5">
          {featured.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === index ? "bg-gold" : "bg-white/30 hover:bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
