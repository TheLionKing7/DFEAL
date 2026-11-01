"use client";

import { useState } from "react";

export function FirmSwitcher({
  firms,
  activeId,
  label = "Switch",
}: {
  firms: { id: string; name: string }[];
  activeId: string;
  label?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function switchTo(id: string) {
    setBusy(id);
    const res = await fetch("/api/firms/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firm_id: id }),
    });
    if (res.ok) window.location.assign("/explore");
    else setBusy(null);
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border text-sm">
      {firms.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <span>{f.name}</span>
          {f.id === activeId ? (
            <span className="text-xs text-success">Active</span>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void switchTo(f.id)}
              className="text-xs text-gold hover:underline disabled:opacity-50"
            >
              {busy === f.id ? "Opening…" : label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
