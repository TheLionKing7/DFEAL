import Link from "next/link";
import { cn } from "@/shared/cn";

export interface OpportunityCardData {
  id: string;
  title: string;
  agency_name?: string | null;
  naics?: string | null;
  set_aside?: string | null;
  response_deadline?: string | null;
  fit_score?: number | null;
  go_no_go?: string | null;
  score_rationale?: string | null;
  sam_url?: string | null;
}

export function OpportunityCard({ opp }: { opp: OpportunityCardData }) {
  return (
    <article className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm transition hover:border-gold/30">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/opportunities/${opp.id}`}
            className="font-medium leading-snug text-text hover:text-gold"
          >
            {opp.title}
          </Link>
          <p className="mt-1 text-sm text-text-muted">
            {opp.agency_name ?? "Agency TBD"}
            {opp.set_aside ? ` · ${opp.set_aside}` : ""}
            {opp.response_deadline
              ? ` · Due ${new Date(opp.response_deadline).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {opp.fit_score != null && (
            <span className="rounded bg-sidebar px-2 py-0.5 text-xs font-medium text-white">
              Score {opp.fit_score}
            </span>
          )}
          {opp.go_no_go && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium uppercase",
                opp.go_no_go === "go"
                  ? "bg-success/15 text-success"
                  : opp.go_no_go === "no_go"
                    ? "bg-error/15 text-error"
                    : "bg-gold/15 text-gold",
              )}
            >
              {opp.go_no_go.replace("_", " ")}
            </span>
          )}
          {opp.naics && (
            <span className="rounded bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
              NAICS {opp.naics}
            </span>
          )}
        </div>
      </div>
      {opp.score_rationale && (
        <p className="mt-2 text-xs text-text-muted">{opp.score_rationale}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href={`/opportunities/${opp.id}`} className="font-medium text-gold hover:underline">
          Open workspace →
        </Link>
        {opp.sam_url && (
          <a href={opp.sam_url} target="_blank" rel="noreferrer" className="text-text-muted hover:text-gold">
            SAM.gov ↗
          </a>
        )}
      </div>
    </article>
  );
}
