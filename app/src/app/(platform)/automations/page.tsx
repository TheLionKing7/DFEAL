"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChipToggle, Toggle } from "@/components/firm/FirmSections";
import { useFirm } from "@/components/firm/FirmProvider";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import type { AutomationConfig } from "@/lib/automations/schema";
import { CONNECTOR_META, type ConnectorView } from "@/lib/connectors/types";
import { SET_ASIDE_OPTIONS, US_STATES } from "@/lib/firms/industries";
import { workspaceLanes } from "@/lib/firms/lanes";
import { DOCUMENT_TYPES } from "@/shared/document-types";
import { cn } from "@/shared/cn";

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  config: AutomationConfig;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: string | null;
}

interface EventItem {
  id: string;
  automation_id: string;
  status: string;
  kind: string;
  ai_summary: string | null;
  fit_score: number | null;
  automation_name: string;
  created_at: string;
  results: { action: string; ok: boolean; message: string }[];
  opportunity: { id: string; title: string; agency_name: string | null; response_deadline: string | null } | null;
}

interface Draft {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  config: AutomationConfig;
}

const NOTICE_TYPES = ["solicitation", "presolicitation", "sources_sought", "special_notice"] as const;

function defaultConfig(): AutomationConfig {
  return {
    trigger: "new_opportunity",
    schedule: "daily",
    filters: {
      lanes: ["federal"],
      states: [],
      naics: [],
      keywords: [],
      agencies: [],
      setAsides: [],
      noticeTypes: [],
      minFitScore: 60,
      goNoGo: ["go", "review"],
    },
    deadlineDays: 7,
    deadlineScope: "both",
    actions: {
      notifyMe: true,
      connectors: [],
      calendarConnectors: [],
      addToTrack: false,
      addToPursuits: false,
      draftDocument: null,
      remember: true,
      mcp: null,
    },
    requireApproval: false,
    aiTriage: true,
    maxPerRun: 10,
  };
}

const TEMPLATES: { name: string; description: string; patch: (c: AutomationConfig, homeState: string | null) => AutomationConfig }[] = [
  {
    name: "Hot federal matches",
    description: "Daily: new SAM.gov opportunities with fit ≥ 70 — AI triage and an email to me.",
    patch: (c) => ({ ...c, filters: { ...c.filters, lanes: ["federal"], minFitScore: 70 } }),
  },
  {
    name: "Home-state bid scout",
    description: "Daily: new state, local and education bids in my home state, added to my track list.",
    patch: (c) => ({
      ...c,
      filters: { ...c.filters, lanes: ["home", "state", "local", "education"], minFitScore: 50 },
      actions: { ...c.actions, addToTrack: true },
    }),
  },
  {
    name: "Pursuit deadline watch",
    description: "Hourly: warn me 7 days before any pursuit or tracked opportunity is due, and remind the team.",
    patch: (c) => ({ ...c, trigger: "deadline_approaching", schedule: "hourly", deadlineDays: 7 }),
  },
  {
    name: "Grant scout (with approval)",
    description: "Daily: new grants that fit — I approve before anything is added to pursuits.",
    patch: (c) => ({
      ...c,
      filters: { ...c.filters, lanes: ["grants"], minFitScore: 40, goNoGo: ["go", "review", "no_go"] },
      requireApproval: true,
      actions: { ...c.actions, addToPursuits: true },
    }),
  },
];

const input = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";

export default function AutomationsPage() {
  const firm = useFirm();
  const lanes = useMemo(() => workspaceLanes(firm), [firm]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [connectors, setConnectors] = useState<ConnectorView[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mcpArgs, setMcpArgs] = useState("{}");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<{ title: string; items: { id: string; title: string; fit: number | null; summary?: string }[] } | null>(null);

  const load = useCallback(async () => {
    const [a, e, c] = await Promise.all([
      fetch("/api/automations").then((r) => r.json() as Promise<{ automations?: Automation[] }>),
      fetch("/api/automations/events").then((r) => r.json() as Promise<{ events?: EventItem[] }>),
      fetch("/api/connectors").then((r) => r.json() as Promise<{ connectors?: ConnectorView[] }>),
    ]);
    setAutomations(a.automations ?? []);
    setEvents(e.events ?? []);
    setConnectors(c.connectors ?? []);
  }, []);

  useEffect(() => {
    void load();
    if (new URLSearchParams(window.location.search).get("new")) {
      setDraft({ name: "", description: "", enabled: true, config: defaultConfig() });
    }
  }, [load]);

  const notifyConnectors = connectors.filter((c) => CONNECTOR_META[c.type].canNotify && c.status !== "disabled");
  const calendarConnectors = connectors.filter((c) => CONNECTOR_META[c.type].canCalendar && c.status !== "disabled");
  const mcpConnectors = connectors.filter((c) => c.type === "mcp" && c.status !== "disabled");
  const pending = events.filter((e) => e.status === "pending_approval");
  const recent = events.filter((e) => e.status !== "pending_approval").slice(0, 25);

  function edit(a?: Automation) {
    setPreview(null);
    setMessage(null);
    if (!a) {
      setDraft({ name: "", description: "", enabled: true, config: defaultConfig() });
      setMcpArgs("{}");
      return;
    }
    setDraft({ id: a.id, name: a.name, description: a.description ?? "", enabled: a.enabled, config: a.config });
    setMcpArgs(JSON.stringify(a.config.actions.mcp?.args ?? {}, null, 2));
  }

  const setCfg = (patch: Partial<AutomationConfig>) => setDraft((d) => (d ? { ...d, config: { ...d.config, ...patch } } : d));
  const setFilters = (patch: Partial<AutomationConfig["filters"]>) =>
    setDraft((d) => (d ? { ...d, config: { ...d.config, filters: { ...d.config.filters, ...patch } } } : d));
  const setActions = (patch: Partial<AutomationConfig["actions"]>) =>
    setDraft((d) => (d ? { ...d, config: { ...d.config, actions: { ...d.config.actions, ...patch } } } : d));

  async function save(): Promise<string | null> {
    if (!draft) return null;
    let config = draft.config;
    if (config.actions.mcp) {
      try {
        config = { ...config, actions: { ...config.actions, mcp: { ...config.actions.mcp, args: JSON.parse(mcpArgs || "{}") } } };
      } catch {
        setMessage({ ok: false, text: "MCP arguments must be valid JSON" });
        return null;
      }
    }
    setBusy("save");
    setMessage(null);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, config }),
    });
    const data = (await res.json()) as { automation?: { id: string }; error?: string; details?: Record<string, string> };
    setBusy(null);
    if (!res.ok || !data.automation) {
      setMessage({
        ok: false,
        text: data.details ? Object.entries(data.details).map(([k, v]) => `${k}: ${v}`).join("; ") : data.error ?? "Save failed",
      });
      return null;
    }
    setDraft((d) => (d ? { ...d, id: data.automation!.id } : d));
    setMessage({ ok: true, text: "Automation saved." });
    await load();
    return data.automation.id;
  }

  async function run(id: string, dryRun: boolean, name: string) {
    setBusy(`${dryRun ? "preview" : "run"}:${id}`);
    setMessage(null);
    const res = await fetch(`/api/automations/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun }),
    });
    const data = (await res.json()) as {
      result?: { matched: number; pending_approval: number; actions_ok: number; actions_failed: number; matches: { id: string; title: string; fit: number | null; summary?: string }[] };
      error?: string;
    };
    setBusy(null);
    if (!res.ok || !data.result) {
      setMessage({ ok: false, text: data.error ?? "Run failed" });
      return;
    }
    if (dryRun) setPreview({ title: `${name} — ${data.result.matched} would match right now`, items: data.result.matches });
    else
      setMessage({
        ok: data.result.actions_failed === 0,
        text: `${name}: ${data.result.matched} matched · ${data.result.pending_approval} awaiting approval · ${data.result.actions_ok} actions ok${data.result.actions_failed ? ` · ${data.result.actions_failed} failed` : ""}.`,
      });
    await load();
  }

  async function remove(a: Automation) {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    await fetch(`/api/automations?id=${a.id}`, { method: "DELETE" });
    if (draft?.id === a.id) setDraft(null);
    await load();
  }

  async function toggle(a: Automation) {
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, name: a.name, description: a.description, enabled: !a.enabled, config: a.config }),
    });
    await load();
  }

  async function resolve(id: string, decision: "approve" | "dismiss") {
    setBusy(id);
    const res = await fetch("/api/automations/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    const data = (await res.json()) as { results?: { ok: boolean; message: string }[]; error?: string };
    setMessage(
      res.ok
        ? { ok: true, text: decision === "approve" ? `Approved — ${(data.results ?? []).map((r) => r.message).join("; ") || "done"}` : "Dismissed." }
        : { ok: false, text: data.error ?? "Failed" },
    );
    setBusy(null);
    await load();
  }

  const c = draft?.config;

  return (
    <PageShell>
      <PageHeader
        title="Automations"
        description={`Agents that watch federal, state, local, education and grant opportunities for ${firm.legalName} and act on what they find — alerts, track lists, pursuits, calendar deadlines, draft documents and MCP tools. They follow your custom instructions and memories.`}
        actions={
          <button type="button" onClick={() => edit()} className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white">
            + New automation
          </button>
        }
      />

      {message && (
        <p className={cn("rounded-lg border px-4 py-3 text-sm", message.ok ? "border-success/30 bg-success/5 text-success" : "border-error/30 bg-error/5 text-error")}>
          {message.text}
        </p>
      )}

      {pending.length > 0 && (
        <Panel title={`Waiting for approval (${pending.length})`}>
          <ul className="space-y-2">
            {pending.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-gold/30 bg-gold/[0.04] p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-text-muted">
                    {e.automation_name} · {e.kind === "deadline" ? "deadline" : "new match"}
                    {e.fit_score != null ? ` · fit ${e.fit_score}` : ""}
                  </p>
                  {e.opportunity && (
                    <Link href={`/opportunities/${e.opportunity.id}`} className="font-medium hover:text-gold">
                      {e.opportunity.title}
                    </Link>
                  )}
                  {e.ai_summary && <p className="mt-1 text-xs text-text-muted">{e.ai_summary}</p>}
                </div>
                <button type="button" disabled={busy === e.id} onClick={() => void resolve(e.id, "approve")} className="rounded-lg bg-sidebar px-3 py-1.5 text-xs text-white">
                  Approve & run
                </button>
                <button type="button" disabled={busy === e.id} onClick={() => void resolve(e.id, "dismiss")} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {draft && c && (
        <Panel title={draft.id ? `Edit: ${draft.name || "automation"}` : "New automation"}>
          {!draft.id && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Start from a template</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setDraft({ ...draft, name: t.name, description: t.description, config: t.patch(defaultConfig(), firm.homeState) })}
                    className="rounded-lg border border-border p-3 text-left text-xs hover:border-gold"
                  >
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="text-text-muted">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Name
                <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="block text-sm font-medium">
                Agent purpose (optional — the agent reads this)
                <textarea rows={2} className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Watch for
                  <select className={input} value={c.trigger} onChange={(e) => setCfg({ trigger: e.target.value as AutomationConfig["trigger"] })}>
                    <option value="new_opportunity">New matching opportunities</option>
                    <option value="deadline_approaching">Deadlines on my pursuits / track list</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Runs
                  <select className={input} value={c.schedule} onChange={(e) => setCfg({ schedule: e.target.value as AutomationConfig["schedule"] })}>
                    <option value="daily">Daily (after the morning ingest)</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </label>
              </div>

              {c.trigger === "deadline_approaching" ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">
                    Days before deadline
                    <input type="number" min={1} max={60} className={input} value={c.deadlineDays} onChange={(e) => setCfg({ deadlineDays: Number(e.target.value) || 7 })} />
                  </label>
                  <label className="text-sm font-medium">
                    Watch
                    <select className={input} value={c.deadlineScope} onChange={(e) => setCfg({ deadlineScope: e.target.value as AutomationConfig["deadlineScope"] })}>
                      <option value="both">Pursuits + track list</option>
                      <option value="pursuits">Pursuits only</option>
                      <option value="track">Track list only</option>
                    </select>
                  </label>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-sm font-medium">Markets</span>
                    <ChipToggle
                      options={lanes.map((l) => l.id)}
                      render={(id) => lanes.find((l) => l.id === id)?.label ?? id}
                      value={c.filters.lanes}
                      onChange={(v) => setFilters({ lanes: v as AutomationConfig["filters"]["lanes"] })}
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium">States (empty = your workspace state scope)</span>
                    <ChipToggle options={US_STATES} value={c.filters.states} onChange={(v) => setFilters({ states: v })} />
                  </div>
                  <label className="block text-sm font-medium">
                    NAICS codes or prefixes (comma-separated, empty = any — e.g. 541512, 5416)
                    <input
                      className={input}
                      value={c.filters.naics.join(", ")}
                      onChange={(e) => setFilters({ naics: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Keywords / industry terms (any of)
                    <input
                      className={input}
                      value={c.filters.keywords.join(", ")}
                      placeholder="e.g. cybersecurity, cloud, EHR"
                      onChange={(e) => setFilters({ keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Agencies (any of)
                    <input
                      className={input}
                      value={c.filters.agencies.join(", ")}
                      placeholder="e.g. Veterans Affairs, Health and Human Services"
                      onChange={(e) => setFilters({ agencies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  </label>
                  <div>
                    <span className="text-sm font-medium">Set-asides (any of)</span>
                    <ChipToggle options={SET_ASIDE_OPTIONS.filter((s) => s !== "None")} value={c.filters.setAsides} onChange={(v) => setFilters({ setAsides: v })} />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Notice types</span>
                    <ChipToggle options={NOTICE_TYPES} value={c.filters.noticeTypes} onChange={(v) => setFilters({ noticeTypes: v as AutomationConfig["filters"]["noticeTypes"] })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-medium">
                      Minimum fit score: {c.filters.minFitScore}
                      <input type="range" min={0} max={100} step={5} className="mt-2 w-full" value={c.filters.minFitScore} onChange={(e) => setFilters({ minFitScore: Number(e.target.value) })} />
                    </label>
                    <div>
                      <span className="text-sm font-medium">Go / no-go</span>
                      <ChipToggle options={["go", "review", "no_go"]} value={c.filters.goNoGo} onChange={(v) => setFilters({ goNoGo: v as AutomationConfig["filters"]["goNoGo"] })} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Actions</p>
              <Toggle label="Email me a summary" checked={c.actions.notifyMe} onChange={(v) => setActions({ notifyMe: v })} />
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Notify connectors</p>
                {notifyConnectors.length === 0 ? (
                  <p className="mt-1 text-xs text-text-muted">
                    No notification connectors yet — add Slack, Teams, email lists, Zapier or Google/Microsoft in{" "}
                    <Link href="/settings?tab=integrations" className="text-gold hover:underline">
                      Settings → Integrations
                    </Link>
                    .
                  </p>
                ) : (
                  notifyConnectors.map((x) => (
                    <label key={x.id} className="mt-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={c.actions.connectors.includes(x.id)}
                        onChange={(e) =>
                          setActions({ connectors: e.target.checked ? [...c.actions.connectors, x.id] : c.actions.connectors.filter((i) => i !== x.id) })
                        }
                      />
                      {x.name} <span className="text-xs text-text-muted">({CONNECTOR_META[x.type].label})</span>
                    </label>
                  ))
                )}
              </div>
              {calendarConnectors.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Add response deadlines to calendar</p>
                  {calendarConnectors.map((x) => (
                    <label key={x.id} className="mt-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={c.actions.calendarConnectors.includes(x.id)}
                        onChange={(e) =>
                          setActions({
                            calendarConnectors: e.target.checked ? [...c.actions.calendarConnectors, x.id] : c.actions.calendarConnectors.filter((i) => i !== x.id),
                          })
                        }
                      />
                      {x.name}
                    </label>
                  ))}
                </div>
              )}
              <Toggle label="Add to my track list" checked={c.actions.addToTrack} onChange={(v) => setActions({ addToTrack: v })} />
              <Toggle label="Add to my pursuits" checked={c.actions.addToPursuits} onChange={(v) => setActions({ addToPursuits: v })} />
              <label className="block text-sm font-medium">
                Draft a document (max 2 per run)
                <select
                  className={input}
                  value={c.actions.draftDocument ?? ""}
                  onChange={(e) => setActions({ draftDocument: (e.target.value || null) as AutomationConfig["actions"]["draftDocument"] })}
                >
                  <option value="">Don&apos;t draft</option>
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              {mcpConnectors.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Call an MCP tool for each match</p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <select
                      className={input}
                      value={c.actions.mcp?.connectorId ?? ""}
                      onChange={(e) => setActions({ mcp: e.target.value ? { connectorId: e.target.value, tool: "", args: {} } : null })}
                    >
                      <option value="">None</option>
                      {mcpConnectors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    {c.actions.mcp && (
                      <select
                        className={input}
                        value={c.actions.mcp.tool}
                        onChange={(e) => setActions({ mcp: { ...c.actions.mcp!, tool: e.target.value } })}
                      >
                        <option value="">Choose tool…</option>
                        {(mcpConnectors.find((m) => m.id === c.actions.mcp!.connectorId)?.config.tools ?? []).map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {c.actions.mcp && (
                    <label className="mt-2 block text-xs">
                      Arguments (JSON). Placeholders: {"{{title}} {{id}} {{agency}} {{deadline}} {{fit}} {{url}} {{summary}} {{naics}}"}
                      <textarea rows={4} className={cn(input, "font-mono text-xs")} value={mcpArgs} onChange={(e) => setMcpArgs(e.target.value)} />
                    </label>
                  )}
                </div>
              )}
              <Toggle label="Remember what it found (adds to memory)" checked={c.actions.remember} onChange={(v) => setActions({ remember: v })} />
              <Toggle
                label="Require my approval before acting"
                description="Matches wait in your approval inbox; nothing is added or sent until you approve."
                checked={c.requireApproval}
                onChange={(v) => setCfg({ requireApproval: v })}
              />
              <Toggle
                label="AI triage"
                description="The agent writes a bid/no-bid read for each match using your firm profile, custom instructions and memories."
                checked={c.aiTriage}
                onChange={(v) => setCfg({ aiTriage: v })}
              />
              <label className="block text-sm font-medium">
                Max matches per run
                <input type="number" min={1} max={25} className={input} value={c.maxPerRun} onChange={(e) => setCfg({ maxPerRun: Number(e.target.value) || 10 })} />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button type="button" disabled={busy === "save"} onClick={() => void save()} className="rounded-lg bg-sidebar px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
              {busy === "save" ? "Saving…" : "Save automation"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void save().then((id) => (id ? run(id, true, draft.name) : undefined))}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-gold"
            >
              Save & preview matches
            </button>
            <button type="button" onClick={() => setDraft(null)} className="ml-auto text-sm text-text-muted">
              Close editor
            </button>
          </div>
        </Panel>
      )}

      {preview && (
        <Panel title={preview.title}>
          <ul className="space-y-2 text-sm">
            {preview.items.map((m) => (
              <li key={m.id} className="rounded-lg border border-border p-3">
                <Link href={`/opportunities/${m.id}`} className="font-medium hover:text-gold">
                  {m.title}
                </Link>
                <span className="ml-2 text-xs text-text-muted">fit {m.fit ?? "—"}</span>
                {m.summary && <p className="mt-1 text-xs text-text-muted">{m.summary}</p>}
              </li>
            ))}
            {preview.items.length === 0 && <li className="text-xs text-text-muted">Nothing matches right now. Try widening markets or lowering the minimum fit.</li>}
          </ul>
          <p className="mt-3 text-xs text-text-muted">Preview takes no actions. Already-handled opportunities are excluded.</p>
        </Panel>
      )}

      <Panel title={`Your automations (${automations.length})`}>
        <ul className="space-y-2">
          {automations.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {a.name}
                  {!a.enabled && <span className="ml-2 text-xs text-text-muted">(off)</span>}
                </p>
                <p className="text-xs text-text-muted">
                  {a.config.trigger === "deadline_approaching"
                    ? `Deadlines within ${a.config.deadlineDays} days`
                    : `${a.config.filters.lanes.join(", ")} · fit ≥ ${a.config.filters.minFitScore}`}{" "}
                  · {a.config.schedule}
                  {a.config.requireApproval ? " · approval required" : ""}
                </p>
                <p className="text-xs text-text-muted">
                  {a.last_run_at ? `Last run ${new Date(a.last_run_at).toLocaleString()} — ${a.last_run_summary ?? a.last_run_status}` : "Never run"}
                </p>
              </div>
              <button type="button" onClick={() => edit(a)} className="text-xs text-text-muted hover:text-text">
                Edit
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void run(a.id, true, a.name)} className="text-xs text-text-muted hover:text-text">
                {busy === `preview:${a.id}` ? "Previewing…" : "Preview"}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => void run(a.id, false, a.name)} className="text-xs text-gold hover:underline">
                {busy === `run:${a.id}` ? "Running…" : "Run now"}
              </button>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={a.enabled} onChange={() => void toggle(a)} /> On
              </label>
              <button type="button" onClick={() => void remove(a)} className="text-xs text-text-muted hover:text-error">
                Delete
              </button>
            </li>
          ))}
          {automations.length === 0 && (
            <li className="text-sm text-text-muted">No automations yet — create one from a template to get started.</li>
          )}
        </ul>
      </Panel>

      <Panel title="Recent agent activity">
        <ul className="space-y-2 text-sm">
          {recent.map((e) => (
            <li key={e.id} className="rounded-lg border border-border p-3">
              <p className="text-[11px] text-text-muted">
                {new Date(e.created_at).toLocaleString()} · {e.automation_name} · <span className={e.status === "failed" ? "text-error" : ""}>{e.status}</span>
              </p>
              {e.opportunity && (
                <Link href={`/opportunities/${e.opportunity.id}`} className="font-medium hover:text-gold">
                  {e.opportunity.title}
                </Link>
              )}
              {e.ai_summary && <p className="mt-1 text-xs text-text-muted">{e.ai_summary}</p>}
              {e.results?.length > 0 && (
                <p className="mt-1 text-[11px] text-text-muted">
                  {e.results.map((r) => `${r.ok ? "✓" : "✗"} ${r.message}`).join(" · ")}
                </p>
              )}
            </li>
          ))}
          {recent.length === 0 && <li className="text-xs text-text-muted">No activity yet.</li>}
        </ul>
      </Panel>
    </PageShell>
  );
}
