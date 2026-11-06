"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: string | null;
  config: { trigger: string; schedule: string };
}

interface EventItem {
  id: string;
  status: string;
  kind: string;
  ai_summary: string | null;
  fit_score: number | null;
  automation_name: string;
  opportunity: { id: string; title: string; agency_name: string | null; response_deadline: string | null } | null;
}

/** Automations at a glance inside the assistant: approvals inbox + agent toggles. */
export function AutomationsQuickView({ onNavigate, onCountChange }: { onNavigate?: () => void; onCountChange?: (n: number) => void }) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [pending, setPending] = useState<EventItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, e] = await Promise.all([
      fetch("/api/automations").then((r) => r.json() as Promise<{ automations?: Automation[] }>),
      fetch("/api/automations/events?status=pending_approval").then((r) => r.json() as Promise<{ events?: EventItem[]; pending?: number }>),
    ]);
    setAutomations(a.automations ?? []);
    setPending(e.events ?? []);
    onCountChange?.(e.pending ?? 0);
  }, [onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, decision: "approve" | "dismiss") {
    setBusy(id);
    const res = await fetch("/api/automations/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    const data = (await res.json()) as { status?: string; results?: { ok: boolean; message: string }[]; error?: string };
    setMsg(res.ok ? (decision === "approve" ? `Done — ${(data.results ?? []).map((r) => r.message).join("; ") || "actions run"}` : "Dismissed.") : data.error ?? "Failed");
    setBusy(null);
    await load();
  }

  async function toggle(a: Automation) {
    setBusy(a.id);
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, enabled: !a.enabled }),
    });
    setBusy(null);
    await load();
  }

  async function runNow(a: Automation) {
    setBusy(a.id);
    const res = await fetch(`/api/automations/${a.id}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = (await res.json()) as { result?: { matched: number; pending_approval: number; actions_ok: number }; error?: string };
    setMsg(res.ok && data.result ? `${a.name}: ${data.result.matched} matched, ${data.result.pending_approval} awaiting approval, ${data.result.actions_ok} actions ok.` : data.error ?? "Run failed");
    setBusy(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automations</h2>
          <p className="text-xs text-text-muted">Agents watching federal, state, local, education and grant opportunities for you.</p>
        </div>
        <Link href="/automations" onClick={onNavigate} className="rounded-lg bg-sidebar px-3 py-1.5 text-xs font-medium text-white">
          Manage & create agents
        </Link>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Waiting for your approval ({pending.length})</h3>
        <ul className="space-y-2">
          {pending.map((e) => (
            <li key={e.id} className="rounded-xl border border-gold/30 bg-gold/[0.04] p-3 text-sm">
              <p className="text-[11px] text-text-muted">
                {e.automation_name} · {e.kind === "deadline" ? "deadline" : "new match"}
                {e.fit_score != null ? ` · fit ${e.fit_score}` : ""}
              </p>
              {e.opportunity ? (
                <Link href={`/opportunities/${e.opportunity.id}`} onClick={onNavigate} className="font-medium hover:text-gold">
                  {e.opportunity.title}
                </Link>
              ) : (
                <p className="font-medium">Opportunity</p>
              )}
              {e.ai_summary && <p className="mt-1 text-xs text-text-muted">{e.ai_summary}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy === e.id}
                  onClick={() => void resolve(e.id, "approve")}
                  className="rounded-lg bg-sidebar px-3 py-1 text-xs text-white disabled:opacity-50"
                >
                  Approve & run actions
                </button>
                <button
                  type="button"
                  disabled={busy === e.id}
                  onClick={() => void resolve(e.id, "dismiss")}
                  className="rounded-lg border border-border px-3 py-1 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
          {pending.length === 0 && <li className="text-xs text-text-muted">Nothing waiting.</li>}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Your agents</h3>
        <ul className="space-y-2">
          {automations.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-surface p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="truncate text-[11px] text-text-muted">
                  {a.config.trigger === "deadline_approaching" ? "Deadline watch" : "New opportunity watch"} · {a.config.schedule} ·{" "}
                  {a.last_run_at ? `last run ${new Date(a.last_run_at).toLocaleString()} — ${a.last_run_summary ?? a.last_run_status}` : "never run"}
                </p>
              </div>
              <button type="button" disabled={busy === a.id} onClick={() => void runNow(a)} className="text-xs text-gold hover:underline">
                Run now
              </button>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={a.enabled} disabled={busy === a.id} onChange={() => void toggle(a)} />
                On
              </label>
            </li>
          ))}
          {automations.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-4 text-xs text-text-muted">
              No agents yet.{" "}
              <Link href="/automations?new=1" onClick={onNavigate} className="text-gold hover:underline">
                Create your first automation
              </Link>{" "}
              — e.g. &ldquo;Alert me in Slack about new VA IT solicitations with fit ≥ 70&rdquo;.
            </li>
          )}
        </ul>
      </section>
      {msg && <p className="text-xs text-text-muted">{msg}</p>}
    </div>
  );
}
