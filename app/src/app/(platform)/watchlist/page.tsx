"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { PURSUIT_STAGES, type PursuitStage } from "@/shared/opportunity-lanes";
import { cn } from "@/shared/cn";

interface PursuitRow {
  id: string;
  opportunity_id: string;
  pursuit_stage: PursuitStage;
  notes: string | null;
  title?: string;
  agency_name?: string | null;
  response_deadline?: string | null;
  fit_score?: number | null;
  go_no_go?: string | null;
}

export default function PursuitsPage() {
  const [pursuits, setPursuits] = useState<PursuitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPursuits(data.pursuits ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Pursuits"
        description="Your active capture pipeline — track stages from qualifying through submission."
      />

      {loading && <p className="text-sm text-text-muted">Loading pursuits…</p>}
      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {!loading && pursuits.length === 0 && (
        <div className="rounded-xl border border-border bg-bg-surface p-6 text-sm text-text-muted">
          No pursuits yet. Open an opportunity and click <strong>Start pursuit</strong>.
        </div>
      )}

      <Panel className="overflow-x-auto p-0">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-text-muted">
              <th className="px-4 py-3">Opportunity</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pursuits.map((p) => (
              <tr key={p.id} className="border-b border-border/60">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.title ?? p.opportunity_id}</p>
                  <p className="text-xs text-text-muted">{p.agency_name}</p>
                </td>
                <td className="px-4 py-3 capitalize">
                  {PURSUIT_STAGES.find((s) => s.id === p.pursuit_stage)?.label ??
                    p.pursuit_stage.replace("_", " ")}
                </td>
                <td className="px-4 py-3">
                  {p.fit_score ?? "—"}
                  {p.go_no_go && (
                    <span
                      className={cn(
                        "ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase",
                        p.go_no_go === "go"
                          ? "bg-success/15 text-success"
                          : p.go_no_go === "no_go"
                            ? "bg-error/15 text-error"
                            : "bg-gold/15 text-gold",
                      )}
                    >
                      {p.go_no_go.replace("_", " ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.response_deadline
                    ? new Date(p.response_deadline).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/opportunities/${p.opportunity_id}`}
                    className="font-medium text-gold hover:underline"
                  >
                    Open workspace
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Panel>
    </PageShell>
  );
}
