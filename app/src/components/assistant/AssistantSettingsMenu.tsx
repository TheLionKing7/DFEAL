"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectorsManager } from "@/components/connectors/ConnectorsManager";
import { useFirm } from "@/components/firm/FirmProvider";
import { cn } from "@/shared/cn";

type Panel = "memories" | "instructions" | "personalization" | "connectors";

const PANELS: { id: Panel; label: string; icon: string; blurb: string }[] = [
  { id: "memories", label: "Memories", icon: "◉", blurb: "Persistent knowledge: your workflows, task status, opportunity decisions and operating guidelines." },
  { id: "instructions", label: "Custom instructions", icon: "✦", blurb: "Standing orders for the agents that run your automations and monitoring." },
  { id: "personalization", label: "Personalization", icon: "◎", blurb: "Your mental model — how you evaluate bids and how you want answers framed." },
  { id: "connectors", label: "Connectors", icon: "⎔", blurb: "Email, calendars, Slack/Teams, Zapier and MCP servers your agents can use." },
];

const CATEGORIES = [
  ["workflow", "Workflow"],
  ["task", "Task / assignment status"],
  ["opportunity", "Opportunity status"],
  ["guideline", "Operating guideline"],
  ["preference", "Preference"],
  ["other", "Other"],
] as const;

interface Memory {
  id: string;
  content: string;
  category: string;
  scope: "user" | "firm";
  source: string;
  pinned: boolean;
  mine: boolean;
  updated_at: string;
}

const field = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";

export function AssistantSettingsMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuOpen && ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div ref={ref} className="relative mt-auto border-t border-border p-2">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-muted hover:bg-bg"
      >
        <span>⚙</span> Settings
      </button>

      {menuOpen && (
        <div className="absolute bottom-full left-2 right-2 z-30 mb-1 overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl">
          {PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPanel(p.id);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-gold/[0.06]"
            >
              <span className="text-gold">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {panel && <SettingsDialog panel={panel} onChange={setPanel} onClose={() => setPanel(null)} />}
    </div>
  );
}

function SettingsDialog({ panel, onChange, onClose }: { panel: Panel; onChange: (p: Panel) => void; onClose: () => void }) {
  const meta = PANELS.find((p) => p.id === panel)!;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4" onMouseDown={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={meta.label}
      >
        <div className="flex items-center gap-1 border-b border-border px-3 pt-3">
          {PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm",
                panel === p.id ? "border-gold font-medium" : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {p.label}
            </button>
          ))}
          <button type="button" onClick={onClose} className="ml-auto rounded p-2 text-text-muted hover:text-text" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <p className="mb-4 text-xs text-text-muted">{meta.blurb}</p>
          {panel === "memories" && <MemoriesPanel />}
          {panel === "instructions" && <InstructionsPanel />}
          {panel === "personalization" && <PersonalizationPanel />}
          {panel === "connectors" && <ConnectorsManager compact />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MemoriesPanel() {
  const firm = useFirm();
  const [items, setItems] = useState<Memory[]>([]);
  const [draft, setDraft] = useState({ content: "", category: "workflow", scope: "user" as "user" | "firm", pinned: false });
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/assistant/memories");
    const data = (await res.json()) as { memories?: Memory[] };
    setItems(data.memories ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(method: string, body?: object, id?: string) {
    setError(null);
    const res = await fetch(`/api/assistant/memories${id ? `?id=${id}` : ""}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Request failed");
      return false;
    }
    await load();
    return true;
  }

  const shown = items.filter((m) => filter === "all" || m.category === filter);

  return (
    <div className="space-y-4 text-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.content.trim()) return;
          void call("POST", draft).then((ok) => ok && setDraft({ ...draft, content: "" }));
        }}
        className="space-y-2 rounded-lg border border-dashed border-border p-3"
      >
        <textarea
          rows={2}
          className={field}
          placeholder='e.g. "We only prime contracts under $5M; above that we team with Leidos." or "Proposal reviews happen Thursdays with Ola."'
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select className="rounded-lg border border-border px-2 py-1.5" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {firm.role !== "member" && (
            <select
              className="rounded-lg border border-border px-2 py-1.5"
              value={draft.scope}
              onChange={(e) => setDraft({ ...draft, scope: e.target.value as "user" | "firm" })}
            >
              <option value="user">Just me</option>
              <option value="firm">Whole team</option>
            </select>
          )}
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> Pin
          </label>
          <button className="ml-auto rounded-lg bg-sidebar px-3 py-1.5 font-medium text-white">Save memory</button>
        </div>
      </form>

      <div className="flex flex-wrap gap-1 text-xs">
        {[["all", "All"], ...CATEGORIES].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={cn("rounded-full border px-2.5 py-0.5", filter === v ? "border-gold bg-gold/10" : "border-border text-text-muted")}
          >
            {l}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {shown.map((m) => (
          <li key={m.id} className={cn("rounded-lg border px-3 py-2", m.pinned ? "border-gold/50 bg-gold/[0.04]" : "border-border")}>
            {editing === m.id ? (
              <div className="space-y-2">
                <textarea rows={2} className={field} value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="flex gap-3 text-xs">
                  <button type="button" className="text-gold" onClick={() => void call("PATCH", { content: editText }, m.id).then(() => setEditing(null))}>
                    Save
                  </button>
                  <button type="button" className="text-text-muted" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm">{m.content}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                  <span className="capitalize">{CATEGORIES.find(([v]) => v === m.category)?.[1] ?? m.category}</span>
                  {m.scope === "firm" && <span>Team-wide</span>}
                  <span>Saved by {m.source === "user" ? "you" : m.source}</span>
                  <span>{new Date(m.updated_at).toLocaleDateString()}</span>
                  {m.mine && (
                    <span className="ml-auto flex gap-3">
                      <button type="button" onClick={() => void call("PATCH", { pinned: !m.pinned }, m.id)} className="hover:text-gold">
                        {m.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(m.id);
                          setEditText(m.content);
                        }}
                        className="hover:text-text"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => void call("DELETE", undefined, m.id)} className="hover:text-error">
                        Forget
                      </button>
                    </span>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
        {shown.length === 0 && (
          <li className="text-xs text-text-muted">
            No memories yet. Add them here, or just tell the assistant — it saves durable facts automatically.
          </li>
        )}
      </ul>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

function useAssistantSettings() {
  const [settings, setSettings] = useState<{ custom_instructions: string; personalization: Record<string, string> } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/assistant/settings")
      .then((r) => r.json())
      .then((d: { settings?: { custom_instructions: string; personalization: Record<string, string> } }) => setSettings(d.settings ?? null));
  }, []);

  async function save(patch: object) {
    setStatus("Saving…");
    const res = await fetch("/api/assistant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { settings?: typeof settings; error?: string };
    if (res.ok && data.settings) setSettings(data.settings);
    setStatus(res.ok ? "Saved." : data.error ?? "Save failed");
  }

  return { settings, setSettings, save, status };
}

function InstructionsPanel() {
  const { settings, setSettings, save, status } = useAssistantSettings();
  if (!settings) return <p className="text-xs text-text-muted">Loading…</p>;
  return (
    <div className="space-y-3 text-sm">
      <textarea
        rows={10}
        className={field}
        placeholder={[
          "Examples:",
          "• Only alert me about solicitations with at least 14 days to respond.",
          "• Treat anything from VA or HHS as high priority; always include the contracting officer if listed.",
          "• When a deadline is within 5 days, recommend a go/no-go decision, not a summary.",
          "• Never auto-add opportunities over $10M to pursuits — flag them for approval instead.",
        ].join("\n")}
        value={settings.custom_instructions}
        onChange={(e) => setSettings({ ...settings, custom_instructions: e.target.value })}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">Applied every time one of your automations triages matches or deadlines.</p>
        <span className="flex items-center gap-3">
          {status && <span className="text-xs text-text-muted">{status}</span>}
          <button
            type="button"
            onClick={() => void save({ custom_instructions: settings.custom_instructions })}
            className="rounded-lg bg-sidebar px-4 py-2 text-xs font-medium text-white"
          >
            Save instructions
          </button>
        </span>
      </div>
    </div>
  );
}

function PersonalizationPanel() {
  const { settings, setSettings, save, status } = useAssistantSettings();
  if (!settings) return <p className="text-xs text-text-muted">Loading…</p>;
  const p = settings.personalization;
  const setP = (k: string, v: string) => setSettings({ ...settings, personalization: { ...p, [k]: v } });
  const select = (k: string, options: [string, string][]) => (
    <select className={field} value={p[k] ?? ""} onChange={(e) => setP(k, e.target.value)}>
      <option value="">Not set</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );

  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <label className="text-xs">
        Your role
        <input className={field} value={p.role ?? ""} placeholder="e.g. CEO / capture lead" onChange={(e) => setP("role", e.target.value)} />
      </label>
      <label className="text-xs">
        Target deal size
        <input className={field} value={p.dealSize ?? ""} placeholder="e.g. $250k – $5M" onChange={(e) => setP("dealSize", e.target.value)} />
      </label>
      <label className="text-xs">
        Decision style
        {select("decisionStyle", [
          ["data_driven", "Data-driven — show the evidence"],
          ["intuitive", "Intuitive — give me the call"],
          ["consensus", "Consensus — frame options for my team"],
        ])}
      </label>
      <label className="text-xs">
        Risk appetite
        {select("riskAppetite", [
          ["conservative", "Conservative — strong fits only"],
          ["balanced", "Balanced"],
          ["aggressive", "Aggressive — stretch for growth"],
        ])}
      </label>
      <label className="text-xs">
        Pursuit strategy
        {select("pursuitStrategy", [
          ["prime", "Prefer to prime"],
          ["sub", "Prefer to sub / team"],
          ["both", "Either, depending on fit"],
        ])}
      </label>
      <label className="text-xs">
        How you want answers
        {select("communicationStyle", [
          ["executive", "Executive brief"],
          ["detailed", "Detailed analysis"],
          ["bullets", "Tight bullets"],
        ])}
      </label>
      <label className="text-xs sm:col-span-2">
        Current priorities
        <textarea rows={3} className={field} value={p.priorities ?? ""} placeholder="e.g. Win our first VA prime this year; grow IL state work." onChange={(e) => setP("priorities", e.target.value)} />
      </label>
      <label className="text-xs sm:col-span-2">
        How you evaluate an opportunity (your mental model)
        <textarea
          rows={4}
          className={field}
          value={p.mentalModels ?? ""}
          placeholder="e.g. Customer relationship first, then past performance relevance, then price-to-win. I walk away if there's an entrenched incumbent and no shaping access."
          onChange={(e) => setP("mentalModels", e.target.value)}
        />
      </label>
      <label className="text-xs sm:col-span-2">
        Things to avoid
        <input className={field} value={p.avoid ?? ""} placeholder="e.g. Construction, LPTA bids, anything requiring a facility clearance" onChange={(e) => setP("avoid", e.target.value)} />
      </label>
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        {status && <span className="text-xs text-text-muted">{status}</span>}
        <button type="button" onClick={() => void save({ personalization: p })} className="rounded-lg bg-sidebar px-4 py-2 text-xs font-medium text-white">
          Save personalization
        </button>
      </div>
    </div>
  );
}
