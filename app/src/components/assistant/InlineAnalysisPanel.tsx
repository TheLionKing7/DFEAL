"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/cn";

interface AnalysisResult {
  summary?: string;
  strengths?: string[];
  risks?: string[];
  recommended_actions?: string[];
  go_no_go?: string;
  teaming_notes?: string;
}

export function InlineAnalysisPanel({
  opportunityId,
  title,
  onClose,
  embedded = true,
}: {
  opportunityId: string;
  title: string;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/analyze`, {
          method: "POST",
        });
        const data = (await res.json()) as { analysis?: AnalysisResult; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");
        if (!cancelled) setAnalysis(data.analysis ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [opportunityId]);

  return (
    <div
      className={cn(
        "mt-2 overflow-hidden rounded-xl border border-border bg-bg",
        embedded && "ml-0",
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-sidebar/[0.04] px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-medium text-text"
        >
          <span className="text-gold">{expanded ? "▾" : "▸"}</span>
          <span className="truncate">Analysis — {title}</span>
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-text-muted hover:text-text">
            Hide
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 p-3 text-xs leading-relaxed text-text-muted">
          {loading && <p>Running capture analysis…</p>}
          {error && <p className="text-error">{error}</p>}
          {analysis && (
            <>
              {analysis.summary && <p className="text-sm text-text">{analysis.summary}</p>}
              {analysis.go_no_go && (
                <p>
                  <span className="font-semibold text-gold">Go / no-go:</span>{" "}
                  {analysis.go_no_go.replace("_", " ")}
                </p>
              )}
              {analysis.strengths?.length ? (
                <div>
                  <p className="font-semibold text-text">Strengths</p>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analysis.risks?.length ? (
                <div>
                  <p className="font-semibold text-text">Risks</p>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.risks.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analysis.recommended_actions?.length ? (
                <div>
                  <p className="font-semibold text-text">Next actions</p>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.recommended_actions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
