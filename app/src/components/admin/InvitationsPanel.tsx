"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/shared/cn";

interface Invitation {
  id: string;
  email: string;
  company_name: string | null;
  status: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const inputCls = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-gold";

export function InvitationsPanel() {
  const [items, setItems] = useState<Invitation[]>([]);
  const [form, setForm] = useState({ email: "", companyName: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/invitations");
    const data = (await res.json()) as { invitations?: Invitation[] };
    setItems(data.invitations ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, companyName: form.companyName || undefined, note: form.note || undefined }),
    });
    const data = (await res.json()) as { error?: string; details?: Record<string, string>; delivery?: string; link?: string };
    if (res.ok) {
      setMsg({
        ok: true,
        text:
          data.delivery === "manual"
            ? "Invitation created, but no email service is configured — send this link to the invitee:"
            : "Invitation sent. The invitee signs in with that email and is taken straight into onboarding.",
        link: data.delivery === "manual" ? data.link : undefined,
      });
      setForm({ email: "", companyName: "", note: "" });
      await load();
    } else {
      setMsg({ ok: false, text: data.details ? Object.values(data.details)[0] : data.error ?? "Invite failed" });
    }
    setBusy(false);
  }

  async function act(id: string, action: "resend" | "revoke") {
    setBusy(true);
    const res =
      action === "revoke"
        ? await fetch(`/api/admin/invitations?id=${id}`, { method: "DELETE" })
        : await fetch("/api/admin/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "resend", id }),
          });
    const data = (await res.json()) as { delivery?: string; link?: string; error?: string };
    setMsg(
      res.ok
        ? { ok: true, text: action === "revoke" ? "Invitation revoked." : "Invitation re-sent.", link: data.delivery === "manual" ? data.link : undefined }
        : { ok: false, text: data.error ?? "Failed" },
    );
    setBusy(false);
    await load();
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide">Invite a business</h2>
        <p className="mt-1 text-xs text-text-muted">
          Smart Capture is invite-only. The invitee signs in with this email, enters their personal and business details,
          and sets up a workspace tailored to their NAICS codes and markets.
        </p>
      </div>
      <form onSubmit={invite} className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">
          Email *
          <input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="text-xs">
          Company name
          <input className={inputCls} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </label>
        <label className="text-xs">
          Personal note
          <input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <div className="sm:col-span-3">
          <button disabled={busy} className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </form>
      {msg && (
        <div className={cn("rounded-lg border px-3 py-2 text-xs", msg.ok ? "border-success/30 text-success" : "border-error/30 text-error")}>
          {msg.text}
          {msg.link && <input readOnly value={msg.link} className="mt-2 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-[11px] text-text" />}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="py-2">Invitee</th>
              <th className="py-2">Status</th>
              <th className="py-2">Sent</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((i) => {
              const expired = i.status === "pending" && new Date(i.expires_at) < new Date();
              return (
                <tr key={i.id}>
                  <td className="py-2">
                    <p>{i.email}</p>
                    {i.company_name && <p className="text-xs text-text-muted">{i.company_name}</p>}
                  </td>
                  <td className="py-2 text-xs capitalize">
                    <span className={i.status === "accepted" ? "text-success" : i.status === "pending" && !expired ? "text-gold" : "text-text-muted"}>
                      {expired ? "expired" : i.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-text-muted">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td className="space-x-3 py-2 text-right text-xs">
                    {i.status === "pending" && (
                      <>
                        <button disabled={busy} onClick={() => void act(i.id, "resend")} className="text-gold hover:underline">
                          Resend
                        </button>
                        <button disabled={busy} onClick={() => void act(i.id, "revoke")} className="text-text-muted hover:text-error">
                          Revoke
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-xs text-text-muted">
                  No invitations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
