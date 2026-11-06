"use client";

import { useCallback, useEffect, useState } from "react";
import { CONNECTOR_META, type ConnectorType, type ConnectorView } from "@/lib/connectors/types";
import { cn } from "@/shared/cn";

interface Available {
  google: boolean;
  microsoft: boolean;
  encryption: boolean;
  platformEmail: boolean;
}

type AddType = Exclude<ConnectorType, "google" | "microsoft">;

const inputCls = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";

export function ConnectorsManager({ compact = false }: { compact?: boolean }) {
  const [connectors, setConnectors] = useState<ConnectorView[]>([]);
  const [available, setAvailable] = useState<Available | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [adding, setAdding] = useState<AddType | null>(null);
  const [form, setForm] = useState({ name: "", url: "", recipients: "", token: "", signingSecret: "", allowAssistant: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/connectors");
    const data = (await res.json()) as { connectors?: ConnectorView[]; available?: Available; canManage?: boolean };
    setConnectors(data.connectors ?? []);
    setAvailable(data.available ?? null);
    setCanManage(Boolean(data.canManage));
  }, []);

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const err = params.get("connector_error");
    const ok = params.get("connected");
    if (err) setMessage({ ok: false, text: err });
    if (ok) setMessage({ ok: true, text: `${ok === "google" ? "Google" : "Microsoft 365"} account connected.` });
  }, [load]);

  async function add() {
    if (!adding) return;
    setBusy("add");
    setMessage(null);
    const body: Record<string, unknown> = { type: adding, name: form.name || CONNECTOR_META[adding].label };
    if (adding === "email") body.recipients = form.recipients.split(",").map((s) => s.trim()).filter(Boolean);
    if (["slack", "teams", "zapier", "webhook", "mcp"].includes(adding)) body.url = form.url;
    if (adding === "webhook" && form.signingSecret) body.signingSecret = form.signingSecret;
    if (adding === "mcp") {
      if (form.token) body.authToken = form.token;
      body.allowAssistant = form.allowAssistant;
    }
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; details?: Record<string, string> };
      if (!res.ok) throw new Error(data.details ? Object.values(data.details)[0] : data.error ?? "Could not add connector");
      setAdding(null);
      setForm({ name: "", url: "", recipients: "", token: "", signingSecret: "", allowAssistant: true });
      setMessage({ ok: true, text: "Connector added." });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Could not add connector" });
    } finally {
      setBusy(null);
    }
  }

  async function test(id: string) {
    setBusy(id);
    setMessage(null);
    const res = await fetch(`/api/connectors/${id}/test`, { method: "POST" });
    const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
    setMessage({ ok: Boolean(data.ok), text: data.message ?? data.error ?? "Test finished" });
    setBusy(null);
    await load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/connectors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this connector? Automations using it will skip it.")) return;
    setBusy(id);
    await fetch(`/api/connectors/${id}`, { method: "DELETE" });
    setBusy(null);
    await load();
  }

  const addable: AddType[] = ["email", "slack", "teams", "zapier", "webhook", "mcp", "calendar_feed"];

  return (
    <div className={cn("space-y-4 text-sm", compact && "text-xs")}>
      {available && !available.encryption && canManage && (
        <p className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs">
          Webhook, MCP and Google/Microsoft connectors store credentials encrypted. Set <code>CONNECTOR_ENCRYPTION_KEY</code> on
          the server to enable them.
        </p>
      )}

      <ul className="space-y-2">
        {connectors.map((c) => (
          <li key={c.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="rounded bg-bg px-1.5 py-0.5 text-[10px] uppercase text-text-muted">{CONNECTOR_META[c.type].label}</span>
              <span
                className={cn(
                  "text-[11px]",
                  c.status === "active" ? "text-success" : c.status === "error" ? "text-error" : "text-text-muted",
                )}
              >
                {c.status}
              </span>
              <span className="ml-auto flex gap-3 text-xs">
                {canManage && (
                  <>
                    <button type="button" disabled={busy === c.id} onClick={() => void test(c.id)} className="text-gold hover:underline">
                      {busy === c.id ? "Working…" : "Test"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void patch(c.id, { enabled: c.status === "disabled" })}
                      className="text-text-muted hover:text-text"
                    >
                      {c.status === "disabled" ? "Enable" : "Disable"}
                    </button>
                    <button type="button" onClick={() => void remove(c.id)} className="text-text-muted hover:text-error">
                      Remove
                    </button>
                  </>
                )}
                {c.type === "mcp" && (
                  <button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="text-text-muted">
                    {expanded === c.id ? "Hide tools" : `Tools (${c.config.tools?.length ?? 0})`}
                  </button>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {c.config.account && `Account: ${c.config.account} · `}
              {c.config.recipients?.length ? `Recipients: ${c.config.recipients.join(", ")} · ` : ""}
              {c.config.urlHint && `Endpoint: ${c.config.urlHint} · `}
              {c.last_tested_at ? `Last tested ${new Date(c.last_tested_at).toLocaleString()}` : "Not tested yet"}
            </p>
            {c.last_error && <p className="mt-1 text-xs text-error">{c.last_error}</p>}
            {c.config.feedUrl && (
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={c.config.feedUrl} className="flex-1 rounded border border-border bg-bg px-2 py-1 font-mono text-[11px]" />
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(c.config.feedUrl!).then(() => setMessage({ ok: true, text: "Feed URL copied — add it in your calendar as “Subscribe from URL”." }))}
                  className="text-xs text-gold hover:underline"
                >
                  Copy
                </button>
              </div>
            )}
            {c.type === "mcp" && expanded === c.id && (
              <div className="mt-2 space-y-1">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={!canManage}
                    checked={c.config.allowAssistant !== false}
                    onChange={(e) => void patch(c.id, { allowAssistant: e.target.checked })}
                  />
                  Let the assistant call this server&apos;s tools in chat
                </label>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-border p-2">
                  {(c.config.tools ?? []).map((t) => {
                    const on = (c.config.allowedTools ?? []).includes(t.name);
                    return (
                      <li key={t.name} className="flex items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          disabled={!canManage}
                          checked={on}
                          onChange={() =>
                            void patch(c.id, {
                              allowedTools: on
                                ? (c.config.allowedTools ?? []).filter((x) => x !== t.name)
                                : [...(c.config.allowedTools ?? []), t.name],
                            })
                          }
                        />
                        <span>
                          <span className="font-mono">{t.name}</span>
                          {t.description && <span className="block text-text-muted">{t.description}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        ))}
        {connectors.length === 0 && <li className="text-xs text-text-muted">No connectors yet.</li>}
      </ul>

      {canManage && (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Add a connector</p>
          <div className="flex flex-wrap gap-2">
            {(["google", "microsoft"] as const).map((p) => (
              <a
                key={p}
                href={available?.[p] ? `/api/connectors/oauth/${p}/start` : undefined}
                aria-disabled={!available?.[p]}
                title={available?.[p] ? "" : "Add the OAuth client ID/secret on the server to enable"}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs",
                  available?.[p] ? "border-border hover:border-gold" : "cursor-not-allowed border-border text-text-muted opacity-60",
                )}
              >
                Connect {CONNECTOR_META[p].label}
                {!available?.[p] && " (not configured)"}
              </a>
            ))}
            {addable.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAdding(adding === t ? null : t)}
                className={cn("rounded-lg border px-3 py-1.5 text-xs", adding === t ? "border-gold bg-gold/10" : "border-border hover:border-gold")}
              >
                + {CONNECTOR_META[t].label}
              </button>
            ))}
          </div>

          {adding && (
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-xs text-text-muted sm:col-span-2">{CONNECTOR_META[adding].description}</p>
              <label className="text-xs">
                Name
                <input className={inputCls} value={form.name} placeholder={CONNECTOR_META[adding].label} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              {adding === "email" && (
                <label className="text-xs">
                  Recipients (comma-separated)
                  <input className={inputCls} value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} />
                </label>
              )}
              {["slack", "teams", "zapier", "webhook", "mcp"].includes(adding) && (
                <label className="text-xs sm:col-span-2">
                  {adding === "mcp" ? "MCP server URL (Streamable HTTP)" : "Webhook URL"}
                  <input className={inputCls} value={form.url} placeholder="https://" onChange={(e) => setForm({ ...form, url: e.target.value })} />
                </label>
              )}
              {adding === "webhook" && (
                <label className="text-xs">
                  Signing secret (optional — adds an HMAC signature header)
                  <input className={inputCls} value={form.signingSecret} onChange={(e) => setForm({ ...form, signingSecret: e.target.value })} />
                </label>
              )}
              {adding === "mcp" && (
                <>
                  <label className="text-xs">
                    Access token (optional)
                    <input className={inputCls} type="password" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={form.allowAssistant} onChange={(e) => setForm({ ...form, allowAssistant: e.target.checked })} />
                    Assistant may use these tools in chat
                  </label>
                </>
              )}
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={busy === "add"}
                  onClick={() => void add()}
                  className="rounded-lg bg-sidebar px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
                >
                  {busy === "add" ? (adding === "mcp" ? "Connecting & discovering tools…" : "Adding…") : "Add connector"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {!canManage && <p className="text-xs text-text-muted">Workspace admins manage connectors.</p>}

      {message && <p className={message.ok ? "text-xs text-success" : "text-xs text-error"}>{message.text}</p>}
    </div>
  );
}
