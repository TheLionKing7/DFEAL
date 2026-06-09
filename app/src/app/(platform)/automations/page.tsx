"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { TENANT } from "@/config/platform";
import type { UserAutomation } from "@/lib/db/user-workspace";

const DEFAULT_AUTOMATION: Omit<UserAutomation, "id" | "created_at" | "updated_at"> = {
  name: "Hot opportunity alert + draft",
  enabled: true,
  description:
    "When a high-fit opportunity is spotted, alert via WhatsApp. After you approve, the agent drafts the proposal document for download.",
  config: {
    trigger: "new_hot_opportunity",
    whatsapp_number: "",
    require_approval: true,
    document_type: "capability_statement",
    notify_email: true,
  },
};

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<UserAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(DEFAULT_AUTOMATION);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automations");
      const data = (await res.json()) as { automations?: UserAutomation[] };
      setAutomations(data.automations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveAutomation() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setDraft(DEFAULT_AUTOMATION);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(automation: UserAutomation) {
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...automation, enabled: !automation.enabled }),
    });
    await load();
  }

  async function removeAutomation(id: string) {
    await fetch(`/api/automations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        title="Automations"
        description={`Configure capture workflows for ${TENANT.assistantName} — alerts, approvals, and document drafting.`}
      />

      <Panel className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-sidebar px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Beta
          </span>
          <p className="text-sm text-text-muted">
            Automations run when ingest and scoring detect matching opportunities.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-bg p-4">
          <h3 className="text-sm font-semibold text-text">New workflow</h3>
          <label className="block text-xs text-text-muted">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </label>
          <label className="block text-xs text-text-muted">
            WhatsApp number (E.164, e.g. +13125551234)
            <input
              className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm"
              placeholder="+1…"
              value={draft.config.whatsapp_number ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  config: { ...d.config, whatsapp_number: e.target.value },
                }))
              }
            />
          </label>
          <label className="block text-xs text-text-muted">
            Trigger
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm"
              value={draft.config.trigger ?? "new_hot_opportunity"}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  config: {
                    ...d.config,
                    trigger: e.target.value as UserAutomation["config"]["trigger"],
                  },
                }))
              }
            >
              <option value="new_hot_opportunity">New hot opportunity (fit ≥ 60, go/review)</option>
              <option value="deadline_approaching">Deadline within 7 days</option>
              <option value="manual">Manual trigger only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={draft.config.require_approval !== false}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  config: { ...d.config, require_approval: e.target.checked },
                }))
              }
            />
            Require my approval before drafting documents
          </label>
          <label className="block text-xs text-text-muted">
            Document to auto-draft after approval
            <select
              className="mt-1 w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm"
              value={draft.config.document_type ?? "capability_statement"}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  config: { ...d.config, document_type: e.target.value },
                }))
              }
            >
              <option value="capability_statement">Capability statement</option>
              <option value="proposal_outline">Proposal outline</option>
              <option value="executive_summary">Executive summary</option>
            </select>
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveAutomation()}
            className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save automation"}
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-text-muted">Loading workflows…</p>}

        <ul className="space-y-3">
          {automations.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-bg-surface p-4"
            >
              <div>
                <p className="font-medium text-text">{a.name}</p>
                <p className="mt-1 text-xs text-text-muted">{a.description}</p>
                <p className="mt-2 text-[10px] uppercase text-text-muted">
                  Trigger: {a.config.trigger?.replace(/_/g, " ") ?? "—"}
                  {a.config.whatsapp_number ? ` · WhatsApp ${a.config.whatsapp_number}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void toggleEnabled(a)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  {a.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => void removeAutomation(a.id)}
                  className="rounded-lg border border-error/30 px-3 py-1.5 text-xs text-error"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!loading && automations.length === 0 && (
            <li className="text-sm text-text-muted">
              No automations yet. Create one above — WhatsApp delivery requires Twilio/Meta API keys
              in a future release; workflows are stored and ready to wire.
            </li>
          )}
        </ul>
      </Panel>
    </PageShell>
  );
}
