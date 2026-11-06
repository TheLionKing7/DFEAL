"use client";

import { useState } from "react";
import { Field, Section, inputCls } from "@/components/firm/FirmSections";

export function ProfileForm({
  email,
  initial,
}: {
  email: string;
  initial: { fullName: string; jobTitle: string; phone: string; timezone: string };
}) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    const data = (await res.json()) as { error?: string; details?: Record<string, string> };
    setMsg(res.ok ? { ok: true, text: "Profile saved." } : { ok: false, text: data.details ? Object.values(data.details)[0] : data.error ?? "Save failed" });
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Section title="My profile" description="Your personal details. Shown to teammates and used by the assistant.">
        <Field label="Full name *">
          <input className={inputCls} value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} />
        </Field>
        <Field label="Job title">
          <input className={inputCls} value={p.jobTitle} onChange={(e) => setP({ ...p, jobTitle: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className={inputCls} value={email} disabled />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} />
        </Field>
        <Field label="Time zone">
          <input className={inputCls} value={p.timezone} placeholder="America/New_York" onChange={(e) => setP({ ...p, timezone: e.target.value })} />
        </Field>
      </Section>
      <div className="flex items-center justify-end gap-3">
        {msg && <span className={msg.ok ? "text-xs text-success" : "text-xs text-error"}>{msg.text}</span>}
        <button disabled={busy} className="rounded-lg bg-sidebar px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          Save profile
        </button>
      </div>
    </form>
  );
}
